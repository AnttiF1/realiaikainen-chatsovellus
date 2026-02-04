const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const MONGODB_URI = process.env.MONGODB_URI;

const MAX_HISTORY = 50;

async function connectMongo() {
  try {
    if (!MONGODB_URI) {
      console.error("MONGODB_URI puuttuu .env-tiedostosta");
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
    process.exit(1);
  }
}

// --- MongoDB malli: viestit ---
const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true, trim: true },
    user: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    ts: { type: Number, required: true, index: true }, // timestamp (Date.now())
  },
  { versionKey: false }
);

const Message = mongoose.model("Message", messageSchema);

// --- Express + Socket.io ---
const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get("/", (_req, res) => {
  res.send("Chat backend OK");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

// --- Socket.io logiikka ---
io.on("connection", (socket) => {
  socket.data.room = null;
  socket.data.user = null;
  socket.data.hasLeft = false; // estää tupla-"poistui"-viestit

  // --- Rate limiting asetukset ---
  const SHORT_LIMIT = 5;
  const SHORT_WINDOW_MS = 2000;

  const LONG_LIMIT = 10;
  const LONG_WINDOW_MS = 30000;

  // per socket state
  socket.data.rlShort = [];
  socket.data.rlLong = [];

  // key on "rlShort" tai "rlLong"
  // limit on viestien maksimimäärä eli SHORT_LIMIT tai LONG_LIMIT
  // windowMs on aikaväli millisekunteina eli SHORT_WINDOW_MS tai LONG_WINDOW_MS
  function consumeSlidingWindow(key, limit, windowMs) {
    const now = Date.now();
    const viestienAikaleimaTaulukko = socket.data[key] || [];
    const rajaAika = now - windowMs;

    const viimeaikaisetViestitTaulukko = viestienAikaleimaTaulukko.filter((t) => t > rajaAika);

    if (viimeaikaisetViestitTaulukko.length >= limit) {
      // 1) Ikkunassa on jo liikaa viestejä
      const ikkunassaVanhinAikaleima = viimeaikaisetViestitTaulukko[0];

      // 2) Milloin se vanhin poistuu ikkunasta?
      const vapautuuAjassa = ikkunassaVanhinAikaleima + windowMs;

      // 3) Kuinka monta ms pitää vielä odottaa?
      const odotaMs = vapautuuAjassa - now;

      // 4) Varmistus: ei negatiivisia
      const retryAfterMs = Math.max(0, odotaMs);

      // 5) Tallenna siivottu lista takaisin socketin muistiin
      socket.data[key] = viimeaikaisetViestitTaulukko;

      return { ok: false, retryAfterMs };
    }

    viimeaikaisetViestitTaulukko.push(now);
    socket.data[key] = viimeaikaisetViestitTaulukko;
    return { ok: true, retryAfterMs: 0 };
  }

  // apufunktio järjestelmäviestien lähettämiseen
  function emitSystem(room, text) {
    socket.to(room).emit("systemMessage", {
      id: `sys-${Date.now()}`,
      text,
      ts: Date.now(),
    });
  }

  // funktio siistiin poistumiseen huoneesta
  function leaveCurrentRoom(reason = "leave") {
    const room = socket.data.room;
    const user = socket.data.user || "Anonymous";

    if (!room) return;
    if (socket.data.hasLeft) return;

    socket.data.hasLeft = true;

    emitSystem(room, `${user} poistui huoneesta`);
    socket.leave(room);

    socket.data.room = null;
    socket.data.user = null;
  }

  // LIITY HUONEESEEN
  socket.on("joinRoom", async ({ room, user }) => {
    const safeRoom = String(room || "").trim();
    const safeUser = String(user || "Anonymous").trim() || "Anonymous";

    if (!safeRoom) {
      socket.emit("errorMessage", { message: "Huoneen nimi puuttuu." });
      return;
    }

    // jos yritetään joinata samaan huoneeseen uudelleen (reconnect tms.), ei spämmätä system-viestejä
    if (socket.data.room === safeRoom) {
      socket.data.user = safeUser; // jos haluat päivittää nimen
      return;
    }

    // jos oltiin jo huoneessa, poistutaan “siististi” ensin (myös huoneenvaihdossa)
    if (socket.data.room && socket.data.room !== safeRoom) {
      leaveCurrentRoom("switch-room");
    }

    // resetoi lippu uutta huonetta varten
    socket.data.hasLeft = false;

    socket.data.room = safeRoom;
    socket.data.user = safeUser;

    socket.join(safeRoom);

    // HAE HUONEEN HISTORIA
    try {
      // Hae huoneen viimeiset viestit MongoDB:stä
      const latest = await Message.find({ room: safeRoom })
        .sort({ ts: -1 })
        .limit(MAX_HISTORY)
        .lean();

      // Käännetään oikeaan järjestykseen (vanhin -> uusin)
      const messages = latest.reverse().map((m) => ({
        id: String(m._id),
        user: m.user,
        text: m.text,
        ts: m.ts,
      }));

      socket.emit("roomHistory", { room: safeRoom, messages });

      socket.to(safeRoom).emit("systemMessage", {
        id: `sys-${Date.now()}`,
        text: `${safeUser} liittyi huoneeseen`,
        ts: Date.now(),
      });
    } catch (err) {
      console.error("History fetch failed:", err);
      socket.emit("errorMessage", { message: "Historian haku epäonnistui." });
    }
  });

  // POISTU HUONEESTA
  socket.on("leaveRoom", () => {
    leaveCurrentRoom("leaveRoom");
  });

  // YHTEYS KATKEAA
  socket.on("disconnecting", (reason) => {
    // disconnecting: socket on vielä huoneissa, mutta me käytetään omaa state
    leaveCurrentRoom(`disconnecting:${reason}`);
  });

  // LÄHETÄ VIESTI
  socket.on("sendMessage", async ({ text }) => {
    
    const room = socket.data.room;
    const user = socket.data.user || "Anonymous";
    
    if (!room) {
      socket.emit("errorMessage", { message: "Et ole huoneessa." });
      return;
    }
    
    const safeText = String(text || "").trim();
    if (!safeText) return;
    
    const short = consumeSlidingWindow("rlShort", SHORT_LIMIT, SHORT_WINDOW_MS);
    if (!short.ok) {
      socket.emit("errorMessage", {
        message: `Liikaa viestejä (max ${SHORT_LIMIT} / ${SHORT_WINDOW_MS / 1000}s).`,
        retryAfterMs: short.retryAfterMs,
        code: "RATE_LIMIT_SHORT",
      });
      return;
    }

    const long = consumeSlidingWindow("rlLong", LONG_LIMIT, LONG_WINDOW_MS);
    if (!long.ok) {
      socket.emit("errorMessage", {
        message: `Liikaa viestejä (max ${LONG_LIMIT} / ${LONG_WINDOW_MS / 1000}s).`,
        retryAfterMs: long.retryAfterMs,
        code: "RATE_LIMIT_LONG",
      });
      return;
    }

    try {
      // Tallenna viesti MongoDB:hen
      const doc = await Message.create({
        room,
        user,
        text: safeText,
        ts: Date.now(),
      });

      const message = {
        id: String(doc._id),
        user: doc.user,
        text: doc.text,
        ts: doc.ts,
      };

      io.to(room).emit("newMessage", { room, message });

      // (valinnainen) pidä huoneen historia max 50 viestissä poistamalla vanhimmat
      // Tämä pitää kokoelman kurissa huonekohtaisesti.
      const count = await Message.countDocuments({ room });
      if (count > MAX_HISTORY) {
        const toDelete = count - MAX_HISTORY;
        const oldest = await Message.find({ room }).sort({ ts: 1 }).limit(toDelete).select("_id");
        const ids = oldest.map((x) => x._id);
        if (ids.length) await Message.deleteMany({ _id: { $in: ids } });
      }
    } catch (err) {
      console.error("Message save failed:", err);
      socket.emit("errorMessage", { message: "Viestin tallennus epäonnistui." });
    }
  });
});

// --- Käynnistä serveri ---

connectMongo().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Allowed origin: ${CLIENT_ORIGIN}`);
  });
});
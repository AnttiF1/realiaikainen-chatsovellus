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

io.on("connection", (socket) => {
  socket.data.room = null;
  socket.data.user = null;

  socket.on("joinRoom", async ({ room, user }) => {
    const safeRoom = String(room || "").trim();
    const safeUser = String(user || "Anonymous").trim() || "Anonymous";

    if (!safeRoom) {
      socket.emit("errorMessage", { message: "Huoneen nimi puuttuu." });
      return;
    }

    // Poistu vanhasta huoneesta
    if (socket.data.room) {
      socket.leave(socket.data.room);
    }

    socket.data.room = safeRoom;
    socket.data.user = safeUser;

    socket.join(safeRoom);

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
      socket.emit("errorMessage", { message: "Historian haku epäonnistui." });
    }
  });

  socket.on("sendMessage", async ({ text }) => {
    const room = socket.data.room;
    const user = socket.data.user || "Anonymous";

    if (!room) {
      socket.emit("errorMessage", { message: "Et ole huoneessa." });
      return;
    }

    const safeText = String(text || "").trim();
    if (!safeText) return;

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
      socket.emit("errorMessage", { message: "Viestin tallennus epäonnistui." });
    }
  });

  socket.on("leaveRoom", () => {
    const room = socket.data.room;
    const user = socket.data.user || "Anonymous";

    if (room) {
      socket.leave(room);
      socket.to(room).emit("systemMessage", {
        id: `sys-${Date.now()}`,
        text: `${user} poistui huoneesta`,
        ts: Date.now(),
      });
    }

    socket.data.room = null;
  });
});

connectMongo().then(() => {
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Allowed origin: ${CLIENT_ORIGIN}`);
  });
});

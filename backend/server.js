const express = require("express");
const http = require("http");
const cors = require("cors");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

dotenv.config();

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));

app.get("/", (_req, res) => {
  res.send("Chat backend OK");
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

// In-memory viestihistoria per huone
// { [roomName]: [ { id, user, text, ts } ] }
const roomMessages = {};
const MAX_HISTORY = 50;

function ensureRoom(room) {
  if (!roomMessages[room]) roomMessages[room] = [];
}

function addMessage(room, msg) {
  ensureRoom(room);
  roomMessages[room].push(msg);
  if (roomMessages[room].length > MAX_HISTORY) {
    roomMessages[room].shift();
  }
}

io.on("connection", (socket) => {
  // Talletetaan socketille "nykyinen huone"
  socket.data.room = null;
  socket.data.user = null;

  socket.on("joinRoom", ({ room, user }) => {
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

    ensureRoom(safeRoom);
    socket.join(safeRoom);

    // Lähetä huoneen historia liittyjälle
    socket.emit("roomHistory", {
      room: safeRoom,
      messages: roomMessages[safeRoom]
    });

    // (Vapaaehtoinen) ilmoitus muille huoneessa
    socket.to(safeRoom).emit("systemMessage", {
      id: `sys-${Date.now()}`,
      text: `${safeUser} liittyi huoneeseen`,
      ts: Date.now()
    });
  });

  socket.on("sendMessage", ({ text }) => {
    const room = socket.data.room;
    const user = socket.data.user || "Anonymous";

    if (!room) {
      socket.emit("errorMessage", { message: "Et ole huoneessa." });
      return;
    }

    const safeText = String(text || "").trim();
    if (!safeText) return;

    const message = {
      id: `${socket.id}-${Date.now()}`,
      user,
      text: safeText,
      ts: Date.now()
    };

    addMessage(room, message);

    io.to(room).emit("newMessage", { room, message });
  });

  socket.on("leaveRoom", () => {
    const room = socket.data.room;
    const user = socket.data.user || "Anonymous";

    if (room) {
      socket.leave(room);
      socket.to(room).emit("systemMessage", {
        id: `sys-${Date.now()}`,
        text: `${user} poistui huoneesta`,
        ts: Date.now()
      });
    }

    socket.data.room = null;
  });

  socket.on("disconnect", () => {
    // Ei pakollista tehdä mitään; huoneet vapautuvat automaattisesti
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Allowed origin: ${CLIENT_ORIGIN}`);
});

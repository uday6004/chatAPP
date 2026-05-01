const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

// MongoDB Message Schema
const messageSchema = new mongoose.Schema({
  username: String,
  message: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// Track online users
const onlineUsers = new Map(); // socketId -> username

io.on("connection", (socket) => {
  console.log(`🔌 New connection: ${socket.id}`);

  // Send last 50 messages on connect
  Message.find().sort({ timestamp: 1 }).limit(50).then((messages) => {
    socket.emit("chat:history", messages);
  });

  // User joins with a username
  socket.on("user:join", (username) => {
    onlineUsers.set(socket.id, username);
    socket.username = username;
    io.emit("user:list", Array.from(onlineUsers.values()));
    io.emit("chat:system", `${username} joined the chat`);
    console.log(`👤 ${username} joined`);
  });

  // Handle incoming message
  socket.on("chat:message", async (data) => {
    const { username, message } = data;
    if (!username || !message.trim()) return;

    const newMsg = new Message({ username, message });
    await newMsg.save();

    io.emit("chat:message", {
      username,
      message,
      timestamp: newMsg.timestamp,
    });
  });

  // Typing indicator
  socket.on("chat:typing", (username) => {
    socket.broadcast.emit("chat:typing", username);
  });

  socket.on("chat:stop_typing", () => {
    socket.broadcast.emit("chat:stop_typing");
  });

  // Disconnect
  socket.on("disconnect", () => {
    const username = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    if (username) {
      io.emit("user:list", Array.from(onlineUsers.values()));
      io.emit("chat:system", `${username} left the chat`);
      console.log(`👋 ${username} disconnected`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});

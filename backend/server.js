const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require("socket.io");

require('dotenv').config(); // Ensure dotenv is configured at the top

// --- Your Existing Routes ---
const adminRoutes = require('./routes/admin');
const bloodBankRoutes = require('./routes/bloodBanks');
const authRoutes = require('./routes/auth'); 
const userRoutes = require('./routes/users');
const requestRoutes = require('./routes/requests');
const bloodBankAdminRoutes = require('./routes/bloodBankAdmin');
const geminiRoutes = require('./routes/gemini');

const app = express();
app.use(cors());
app.use(express.json());

// --- Socket.IO and HTTP Server Setup ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // Your React app's address
    methods: ["GET", "POST"]
  }
});
app.set('socketio', io); // Make io accessible in your routes

// --- Handle Socket.IO connections ---
let onlineUsers = new Map(); // To track online users
app.set('onlineUsers', onlineUsers); // <-- ADDED THIS LINE

io.on("connection", (socket) => {
  console.log(`⚡ New client connected: ${socket.id}`);

  // Listen for a user to come online
  socket.on("addUser", (userId) => {
    onlineUsers.set(userId, socket.id);
    console.log(`User ${userId} is now online.`);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    // Find and remove user from onlineUsers map
    for (let [userId, socketId] of onlineUsers.entries()) {
      if (socketId === socket.id) {
        onlineUsers.delete(userId);
        break;
      }
    }
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});


// --- Define Your API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/blood-banks', bloodBankRoutes);
app.use('/api/blood-bank-admin', bloodBankAdminRoutes);
app.use('/api/gemini', geminiRoutes);
// In app.js - make sure these routes are mounted
app.use('/api/blood-banks', require('./routes/bloodBanks'));
app.use('/api/blood-bank-admin', require('./routes/bloodBankAdmin')); // This should exist


const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB');
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('❌ Connection error', err.message);
  });


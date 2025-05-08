const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // For development, allow all origins
    methods: ["GET", "POST"]
  }
});

const users = {}; // socket.id -> {username, id}
const admins = {}; // socket.id -> username of admins

io.on("connection", (socket) => {
  console.log(`New user connected: ${socket.id}`);

  // Handle setting username
  socket.on("setUsername", (username) => {
    users[socket.id] = {
      username: username,
      id: socket.id
    };
    
    // Send the full user objects to clients
    io.emit("users", Object.values(users));
  });

  socket.on("requestAdminStatus", (username) => {
    // In a real app, you'd validate admin credentials
    if (username.toLowerCase() === "admin") {
      admins[socket.id] = username;
      socket.emit("adminStatus", true);
      console.log(`Admin rights granted to: ${username}`);
    }
  });

  socket.on("kickUser", (userSocketId) => {
    // Check if requester is an admin
    if (admins[socket.id]) {
      if (users[userSocketId]) {
        console.log(`Admin ${admins[socket.id]} kicked user: ${users[userSocketId].username}`);
        
        // Notify the user they've been kicked
        io.to(userSocketId).emit("kicked");
        
        // Remove the user
        delete users[userSocketId];
        
        // Update the user list for all clients
        io.emit("users", Object.values(users));
      }
    }
  });

  // Handle public messages
  socket.on("sendMessage", (data) => {
    io.emit("message", data);
  });

  // Handle private messages
  socket.on("sendPrivateMessage", (data) => {
    const { to, message, username } = data;
    
    // Find the recipient's socket id
    const recipientSocket = Object.values(users).find(user => user.username === to);
    
    if (recipientSocket) {
      // Send to recipient
      io.to(recipientSocket.id).emit("privateMessage", {
        from: username,
        message: message,
        private: true
      });
      
      // Also send back to sender to display in their chat
      socket.emit("privateMessage", {
        to: to,
        message: message,
        private: true,
        fromSelf: true
      });
      
      console.log(`Private message from ${username} to ${to}`);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    delete users[socket.id];
    delete admins[socket.id];
    io.emit("users", Object.values(users));
  });
});

// Start the server
server.listen(5000, "0.0.0.0", () => {
  console.log("Server running on all interfaces (e.g. http://192.168.29.109:5000 or http://26.142.23.142:5000)");
});
// Enhanced Express + Socket.IO server for chat with user management (Production Ready)

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();

// Allow frontend connections (Vercel / any client)
app.use(cors({
  origin: [
    'https://chat-application-6s01.onrender.com', // backend itself
    'https://chat-application.vercel.app',        // example frontend (replace if needed)
    '*'
  ],
  methods: ['GET', 'POST']
}));

const server = http.createServer(app);

// Socket.IO with proper CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected users
const connectedUsers = new Map(); // socketId -> username
const usernames = new Set();      // Track taken usernames

// Helper function to get all connected usernames
function getConnectedUsernames() {
  return Array.from(connectedUsers.values()).sort();
}

// Socket connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // User joins chat
  socket.on('join chat', (username) => {

    if (!username || username.trim().length < 2) {
      socket.emit('join error', 'Username must be at least 2 characters long');
      return;
    }

    if (username.trim().length > 20) {
      socket.emit('join error', 'Username must be less than 20 characters');
      return;
    }

    const cleanUsername = username.trim();

    if (usernames.has(cleanUsername.toLowerCase())) {
      socket.emit('join error', 'Username already taken');
      return;
    }

    connectedUsers.set(socket.id, cleanUsername);
    usernames.add(cleanUsername.toLowerCase());

    socket.emit('join success', {
      username: cleanUsername,
      users: getConnectedUsernames()
    });

    socket.broadcast.emit('user joined', {
      username: cleanUsername,
      users: getConnectedUsernames()
    });

    console.log(`${cleanUsername} joined`);
  });

  // Message handling
  socket.on('chat message', (messageData) => {
    const username = connectedUsers.get(socket.id);

    if (!username) {
      socket.emit('join error', 'Join chat first');
      return;
    }

    const message = {
      text: messageData.text,
      username,
      timestamp: messageData.timestamp || new Date().toISOString(),
      socketId: socket.id
    };

    io.emit('chat message', message);
    console.log(`${username}: ${message.text}`);
  });

  // Leave chat
  socket.on('leave chat', () => {
    handleDisconnect(socket);
  });

  // Disconnect
  socket.on('disconnect', () => {
    handleDisconnect(socket);
  });

  function handleDisconnect(socket) {
    const username = connectedUsers.get(socket.id);

    if (username) {
      connectedUsers.delete(socket.id);
      usernames.delete(username.toLowerCase());

      socket.broadcast.emit('user left', {
        username,
        users: getConnectedUsernames()
      });

      console.log(`${username} left`);
    }
  }
});

// Root route (Render health check)
app.get('/', (req, res) => {
  res.send(`
    <h1>Chat Server Running</h1>
    <p>Status: Online</p>
    <p>Connected Users: ${connectedUsers.size}</p>
    <p>Users: ${getConnectedUsernames().join(', ') || 'None'}</p>
    <p>Backend URL: https://chat-application-6s01.onrender.com</p>
  `);
});

// Stats API
app.get('/api/stats', (req, res) => {
  res.json({
    connectedUsers: connectedUsers.size,
    usernames: getConnectedUsernames(),
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Chat server running on port ${PORT}`);
  console.log(`Backend URL: https://chat-application-6s01.onrender.com`);
});

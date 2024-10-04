const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: 'http://localhost:5173',
}));

const PORT = process.env.PORT || 3001;

app.get('/', (req, res) => {
  res.send('Server is running');
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('join-room', (roomId, userName) => {
    socket.join(roomId);
    console.log(`${userName} joined room: ${roomId}`);
    socket.to(roomId).emit('user-connected', userName);
  });

  // Relay signaling data between peers
  socket.on('signal', (data) => {
    socket.to(data.roomId).emit('signal', data);
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    socket.to(data.roomId).emit('chat-message', data.message);
  });

  // Handle stop sharing
  socket.on('stop-sharing', (roomId) => {
    socket.to(roomId).emit('stop-sharing');
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

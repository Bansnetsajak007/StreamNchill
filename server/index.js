const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // Frontend origin
    methods: ['GET', 'POST'],
  },
});

app.use(cors({
  origin: 'http://localhost:5173', // Frontend origin
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

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname + '/public'));

let rooms = {};

io.on('connection', (socket) => {
  console.log('ユーザー接続:', socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);

    if (rooms[roomId].length === 2) {
      io.to(roomId).emit('startGame', rooms[roomId]);
    }
  });

  socket.on('move', (data) => {
    socket.to(data.roomId).emit('opponentMove', data);
  });
});

server.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`);
});

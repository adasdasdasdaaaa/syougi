const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const cards = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'cards.json')));

let players = {};
let waitingPlayer = null;

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('player connected:', socket.id);

  players[socket.id] = {
    id: socket.id,
    hand: [],
    deck: [],
    battlefield: null, // バトル場のカード
    opponentId: null,
    turn: false,
    hp: 100,
    socket: socket
  };

  socket.emit('cardPool', cards);

  socket.on('drawCards', (count) => {
    const hand = [];
    for(let i=0; i<count; i++) {
      const card = cards[Math.floor(Math.random() * cards.length)];
      hand.push(card);
    }
    players[socket.id].hand = hand;
    socket.emit('handUpdated', hand);
  });

  socket.on('setDeck', (deckIds) => {
    const player = players[socket.id];
    player.deck = deckIds.map(id => cards.find(c => c.id === id));
    matchPlayers(socket.id);
  });

  socket.on('playCard', (cardId) => {
    const player = players[socket.id];
    if (!player.turn) return;
    const card = player.deck.find(c => c.id === cardId);
    if (!card) return;

    player.battlefield = card;
    player.hand = player.hand.filter(c => c.id !== cardId);

    // 交代
    player.turn = false;
    const opponent = players[player.opponentId];
    if (opponent) opponent.turn = true;

    // 攻撃判定
    if (opponent && opponent.battlefield) {
      opponent.hp -= card.attack;
      if (opponent.hp < 0) opponent.hp = 0;
    }

    // 状態送信
    player.socket.emit('gameUpdate', {
      yourHp: player.hp,
      opponentHp: opponent ? opponent.hp : null,
      turn: player.turn,
      battlefield: player.battlefield,
      opponentBattlefield: opponent ? opponent.battlefield : null
    });
    if (opponent) {
      opponent.socket.emit('gameUpdate', {
        yourHp: opponent.hp,
        opponentHp: player.hp,
        turn: opponent.turn,
        battlefield: opponent.battlefield,
        opponentBattlefield: player.battlefield
      });
    }

    // 勝敗判定
    if (opponent && opponent.hp === 0) {
      player.socket.emit('gameOver', { winner: true });
      opponent.socket.emit('gameOver', { winner: false });
      delete players[player.opponentId].opponentId;
      delete players[socket.id].opponentId;
    }
  });

  socket.on('disconnect', () => {
    const player = players[socket.id];
    if (player) {
      const opponentId = player.opponentId;
      if (opponentId && players[opponentId]) {
        players[opponentId].socket.emit('gameOver', { winner: true, reason: '相手が切断しました' });
        delete players[opponentId].opponentId;
      }
      delete players[socket.id];
    }
  });

  function matchPlayers(id) {
    const player = players[id];
    if (waitingPlayer === null) {
      waitingPlayer = id;
      player.socket.emit('waiting', '対戦相手を待っています...');
    } else if (waitingPlayer !== id) {
      const opponent = players[waitingPlayer];
      player.opponentId = waitingPlayer;
      opponent.opponentId = id;

      const firstTurn = Math.random() < 0.5 ? id : waitingPlayer;
      players[firstTurn].turn = true;
      players[firstTurn === id ? waitingPlayer : id].turn = false;

      player.socket.emit('matchStart', { yourTurn: player.turn });
      opponent.socket.emit('matchStart', { yourTurn: opponent.turn });

      waitingPlayer = null;
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

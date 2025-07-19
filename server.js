const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// カードデータを読み込み
const cards = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'cards.json')));

// プレイヤーデータ管理
let players = {};
let waitingPlayer = null; // マッチ待ちプレイヤー

app.use(express.static(path.join(__dirname, 'public')));

io.on('connection', (socket) => {
  console.log('プレイヤー接続:', socket.id);
  
  // プレイヤーデータ初期化
  players[socket.id] = {
    id: socket.id,
    hand: [],    // ガチャで引いたカード
    deck: [],    // 編成したデッキ(5枚)
    opponentId: null,
    turn: false,
    hp: 100,
    socket: socket
  };

  // カードプールを送る（ガチャ画面用）
  socket.emit('cardPool', cards);

  // ガチャ実行（ランダムでカードn枚引く）
  socket.on('drawCards', (count) => {
    const hand = [];
    for(let i=0; i<count; i++) {
      const card = cards[Math.floor(Math.random() * cards.length)];
      hand.push(card);
    }
    players[socket.id].hand = hand;
    socket.emit('handUpdated', hand);
  });

  // 編成完了。deckはカードidの配列
  socket.on('setDeck', (deckIds) => {
    const player = players[socket.id];
    player.deck = deckIds.map(id => cards.find(c => c.id === id));
    // マッチング処理へ
    matchPlayers(socket.id);
  });

  // 攻撃通知
  socket.on('attack', (cardId) => {
    const player = players[socket.id];
    const opponent = players[player.opponentId];
    if (!player.turn || !opponent) return;

    const attackCard = player.deck.find(c => c.id === cardId);
    if (!attackCard) return;

    // 攻撃処理
    opponent.hp -= attackCard.attack;
    if (opponent.hp < 0) opponent.hp = 0;

    // ターン交代
    player.turn = false;
    opponent.turn = true;

    // 状態を両者に送信
    player.socket.emit('gameUpdate', {
      yourHp: player.hp,
      opponentHp: opponent.hp,
      turn: player.turn
    });
    opponent.socket.emit('gameUpdate', {
      yourHp: opponent.hp,
      opponentHp: player.hp,
      turn: opponent.turn
    });

    // 勝敗判定
    if (opponent.hp === 0) {
      player.socket.emit('gameOver', { winner: true });
      opponent.socket.emit('gameOver', { winner: false });
      // 対戦終了、切断処理など
      delete players[player.opponentId].opponentId;
      delete players[socket.id].opponentId;
    }
  });

  // 切断時処理
  socket.on('disconnect', () => {
    console.log('切断:', socket.id);
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
      // マッチング成立
      const opponent = players[waitingPlayer];
      player.opponentId = waitingPlayer;
      opponent.opponentId = id;

      // ランダムで先攻決め
      const firstTurn = Math.random() < 0.5 ? id : waitingPlayer;
      players[firstTurn].turn = true;
      players[firstTurn === id ? waitingPlayer : id].turn = false;

      // ゲーム開始通知
      player.socket.emit('matchStart', { yourTurn: player.turn });
      opponent.socket.emit('matchStart', { yourTurn: opponent.turn });

      waitingPlayer = null;
    }
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

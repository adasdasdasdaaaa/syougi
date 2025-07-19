const socket = io();

let hand = [];
let deck = [];
let yourTurn = false;

const btnDraw = document.getElementById('btnDraw');
const handDiv = document.getElementById('hand');
const deckSection = document.getElementById('deckSection');
const deckPool = document.getElementById('deckPool');
const btnStart = document.getElementById('btnStart');
const phaseDiv = document.getElementById('phase');
const gameSection = document.getElementById('gameSection');
const statusDiv = document.getElementById('status');
const battleField = document.getElementById('battleField');
const opponentBattleField = document.getElementById('opponentBattleField');

btnDraw.onclick = () => {
  socket.emit('drawCards', 20);
  btnDraw.disabled = true;
};

socket.on('cardPool', (cards) => {
  window.cardPool = cards;
});

socket.on('handUpdated', (cards) => {
  hand = cards;
  showHand();
  phaseDiv.style.display = 'none';
  deckSection.style.display = 'block';
});

function showHand() {
  handDiv.innerHTML = '';
  hand.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card';
    cardDiv.textContent = `${card.name} (HP:${card.hp} 攻:${card.attack})`;
    cardDiv.onclick = () => {
      if (deck.length < 20 && !deck.find(c => c.id === card.id)) {
        deck.push(card);
        updateDeckPool();
      }
    };
    handDiv.appendChild(cardDiv);
  });
}

function updateDeckPool() {
  deckPool.innerHTML = '';
  deck.forEach(card => {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card selected';
    cardDiv.textContent = `${card.name} (HP:${card.hp} 攻:${card.attack})`;
    cardDiv.onclick = () => {
      deck = deck.filter(c => c.id !== card.id);
      updateDeckPool();
    };
    deckPool.appendChild(cardDiv);
  });
  btnStart.disabled = deck.length !== 20;
}

btnStart.onclick = () => {
  socket.emit('setDeck', deck.map(c => c.id));
  deckSection.style.display = 'none';
  gameSection.style.display = 'block';
  statusDiv.textContent = '対戦相手を探しています...';
};

socket.on('waiting', (msg) => {
  statusDiv.textContent = msg;
});

socket.on('matchStart', (data) => {
  yourTurn = data.yourTurn;
  statusDiv.textContent = yourTurn ? 'あなたのターンです。カードをバトル場に出してください！' : '相手のターンです。待ってください。';
  battleField.innerHTML = '';
  opponentBattleField.innerHTML = '';
  deck.forEach(card => {
    const cardBtn = document.createElement('button');
    cardBtn.textContent = `${card.name} (攻:${card.attack})`;
    cardBtn.disabled = !yourTurn;
    cardBtn.onclick = () => {
      if (!yourTurn) return;
      socket.emit('playCard', card.id);
    };
    battleField.appendChild(cardBtn);
  });
});

socket.on('gameUpdate', (data) => {
  yourTurn = data.turn;
  statusDiv.textContent = `あなたのHP: ${data.yourHp} | 相手のHP: ${data.opponentHp}` + (yourTurn ? ' あなたのターンです。カードを出してください。' : ' 相手のターンです。');
  battleField.querySelectorAll('button').forEach(btn => btn.disabled = !yourTurn);

  // バトル場カード表示
  battleField.title = data.battlefield ? `${data.battlefield.name} (攻:${data.battlefield.attack})` : '';
  opponentBattleField.textContent = data.opponentBattlefield ? `相手の場: ${data.opponentBattlefield.name} (攻:${data.opponentBattlefield.attack})` : '相手の場: なし';
});

socket.on('gameOver', (data) => {
  if (data.winner) {
    alert('あなたの勝ちです！');
  } else {
    alert('あなたの負けです...');
  }
  location.reload();
});

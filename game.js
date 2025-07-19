const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreElem = document.getElementById('score');
const gameOverElem = document.getElementById('gameOver');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

let score = 0;
let gameOver = false;

const player = {
  x: WIDTH / 2 - 20,
  y: HEIGHT - 80,
  width: 40,
  height: 40,
  speed: 5,
  color: 'orange',
  bullets: []
};

const enemies = [];

function createEnemy() {
  const x = Math.random() * (WIDTH - 40);
  enemies.push({
    x,
    y: -40,
    width: 40,
    height: 40,
    speed: 2 + Math.random() * 1.5,
    color: 'red'
  });
}

function drawFish(x, y, width, height, color) {
  ctx.fillStyle = color;
  // 体
  ctx.beginPath();
  ctx.ellipse(x + width/2, y + height/2, width/2, height/3, 0, 0, Math.PI * 2);
  ctx.fill();
  // 目
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(x + width * 0.7, y + height * 0.4, width * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(x + width * 0.7, y + height * 0.4, width * 0.05, 0, Math.PI * 2);
  ctx.fill();
  // 尾びれ
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + width, y + height/2);
  ctx.lineTo(x + width + 15, y + height/4);
  ctx.lineTo(x + width + 15, y + height * 3/4);
  ctx.closePath();
  ctx.fill();
}

function update() {
  if (gameOver) return;

  // プレイヤー移動
  if (keys['ArrowLeft']) player.x -= player.speed;
  if (keys['ArrowRight']) player.x += player.speed;

  // 画面内制限
  if (player.x < 0) player.x = 0;
  if (player.x + player.width > WIDTH) player.x = WIDTH - player.width;

  // 弾の更新
  player.bullets.forEach((b, i) => {
    b.y -= b.speed;
    if (b.y + b.height < 0) {
      player.bullets.splice(i, 1);
    }
  });

  // 敵の更新
  enemies.forEach((enemy, i) => {
    enemy.y += enemy.speed;
    if (enemy.y > HEIGHT) {
      // 敵が下まで行ったらゲームオーバー
      gameOver = true;
      gameOverElem.style.display = 'block';
    }

    // 弾との当たり判定
    player.bullets.forEach((b, bi) => {
      if (b.x < enemy.x + enemy.width &&
          b.x + b.width > enemy.x &&
          b.y < enemy.y + enemy.height &&
          b.y + b.height > enemy.y) {
        // 当たった
        player.bullets.splice(bi, 1);
        enemies.splice(i, 1);
        score += 10;
        scoreElem.textContent = score;
      }
    });

    // プレイヤーとの当たり判定
    if (player.x < enemy.x + enemy.width &&
        player.x + player.width > enemy.x &&
        player.y < enemy.y + enemy.height &&
        player.y + player.height > enemy.y) {
      gameOver = true;
      gameOverElem.style.display = 'block';
    }
  });

  // 敵を一定間隔で追加
  if (Math.random() < 0.02) {
    createEnemy();
  }
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // プレイヤー金魚
  drawFish(player.x, player.y, player.width, player.height, player.color);

  // 弾
  player.bullets.forEach(b => {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });

  // 敵金魚
  enemies.forEach(enemy => {
    drawFish(enemy.x, enemy.y, enemy.width, enemy.height, enemy.color);
  });
}

function loop() {
  update();
  draw();
  if (!gameOver) requestAnimationFrame(loop);
}

const keys = {};
window.addEventListener('keydown', e => {
  keys[e.key] = true;

  // スペースキーで弾を撃つ
  if (e.key === ' ') {
    player.bullets.push({
      x: player.x + player.width / 2 - 5,
      y: player.y,
      width: 10,
      height: 20,
      speed: 8
    });
  }
});
window.addEventListener('keyup', e => {
  keys[e.key] = false;
});

loop();

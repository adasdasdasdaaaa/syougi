const socket = io();
const roomId = prompt("ルームIDを入力または作成:");
socket.emit("joinRoom", roomId);

const board = document.getElementById("board");
let selected = null;
let boardState = [];

// 初期化（9x9に歩だけ置く簡易盤面）
function initBoard() {
  board.innerHTML = "";
  boardState = [];

  for (let y = 0; y < 9; y++) {
    const row = [];
    for (let x = 0; x < 9; x++) {
      const cell = document.createElement("div");
      if (y === 2) {
        cell.textContent = "歩";
        cell.dataset.piece = "歩";
        cell.dataset.color = "black";
      } else if (y === 6) {
        cell.textContent = "歩";
        cell.dataset.piece = "歩";
        cell.dataset.color = "white";
      }

      cell.dataset.x = x;
      cell.dataset.y = y;

      cell.addEventListener("click", () => handleClick(cell));
      board.appendChild(cell);
      row.push(cell);
    }
    boardState.push(row);
  }
}

function handleClick(cell) {
  if (selected) {
    // 移動処理
    const from = { x: parseInt(selected.dataset.x), y: parseInt(selected.dataset.y) };
    const to = { x: parseInt(cell.dataset.x), y: parseInt(cell.dataset.y) };
    const piece = selected.dataset.piece;
    const color = selected.dataset.color;

    if (isLegalMove(from, to, piece, boardState, color)) {
      cell.textContent = piece;
      cell.dataset.piece = piece;
      cell.dataset.color = color;

      selected.textContent = "";
      delete selected.dataset.piece;
      delete selected.dataset.color;

      socket.emit("move", { roomId, from, to, piece });
    }

    selected = null;
  } else if (cell.dataset.piece) {
    selected = cell;
  }
}

socket.on("startGame", () => {
  alert("対戦開始！");
  initBoard();
});

socket.on("opponentMove", ({ from, to, piece }) => {
  const fromCell = boardState[from.y][from.x];
  const toCell = boardState[to.y][to.x];

  toCell.textContent = piece;
  toCell.dataset.piece = piece;
  toCell.dataset.color = fromCell.dataset.color;

  fromCell.textContent = "";
  delete fromCell.dataset.piece;
  delete fromCell.dataset.color;
});

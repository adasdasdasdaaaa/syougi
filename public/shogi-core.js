function isLegalMove(from, to, piece, board, color) {
  if (piece === '歩') {
    const dy = color === 'black' ? -1 : 1;
    return to.x === from.x && to.y === from.y + dy;
  }
  return true;
}

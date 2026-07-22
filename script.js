const boardEl = document.getElementById('board');
const statusEl = document.getElementById('status');
const winLineEl = document.getElementById('winLine');
const scoreXEl = document.getElementById('scoreX');
const scoreOEl = document.getElementById('scoreO');
const scoreDrawsEl = document.getElementById('scoreDraws');
const scoreXCard = document.getElementById('scoreXCard');
const scoreOCard = document.getElementById('scoreOCard');
const scoreXLabel = document.getElementById('scoreXLabel');
const scoreOLabel = document.getElementById('scoreOLabel');

const modeThumbGame = document.getElementById('modeThumbGame');
const modePvpBtn = document.getElementById('modePvpBtn');
const modePvaiBtn = document.getElementById('modePvaiBtn');
const difficultyDrawer = document.getElementById('difficultyDrawer');
const difficultyThumb = document.getElementById('difficultyThumb');
const difficultyBtns = { easy: document.getElementById('easyBtn'), medium: document.getElementById('mediumBtn'), hard: document.getElementById('hardBtn') };
const hardBadge = document.getElementById('hardBadge');

const WIN_COMBOS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let board = Array(9).fill('');
let currentPlayer = 'X';
let gameActive = true;
let score = { X: 0, O: 0, draws: 0 };

let gameMode = 'pvp';     // 'pvp' | 'pvai'
let difficulty = 'medium'; // 'easy' | 'medium' | 'hard'
let aiThinking = false;
let aiTimeoutId = null;

function createBoard() {
  boardEl.innerHTML = '';
  board.forEach((mark, index) => {
    const cell = document.createElement('button');
    cell.className = 'cell';
    cell.dataset.index = index;
    cell.setAttribute('aria-label', `Cell ${index + 1}, empty`);
    cell.addEventListener('click', handleCellClick);
    boardEl.appendChild(cell);
  });
}

function handleCellClick(e) {
  const cell = e.currentTarget;
  const index = cell.dataset.index;
  if (board[index] !== '' || !gameActive || aiThinking) return;
  applyMove(index, currentPlayer);
}

function applyMove(index, player, opts = {}) {
  const cell = boardEl.children[index];
  board[index] = player;
  cell.textContent = player;
  cell.classList.add('mark-' + player.toLowerCase(), 'pop-in');
  if (opts.isAiMove) cell.classList.add('ai-move');
  cell.disabled = true;
  cell.setAttribute('aria-label', `Cell ${Number(index) + 1}, ${player}`);

  const winCombo = getWinningCombo(player);
  if (winCombo) {
    highlightWin(winCombo);
    drawWinLine(winCombo, player);
    setStatus(resultText(player), player.toLowerCase(), true);
    score[player]++;
    updateScore(player);
    gameActive = false;
    setActivePlayerCard(null);
    lockBoard();
    return;
  }

  if (board.every(mark => mark !== '')) {
    setStatus("It's a Draw!", 'draw', true);
    score.draws++;
    updateScore('draws');
    gameActive = false;
    setActivePlayerCard(null);
    lockBoard();
    return;
  }

  currentPlayer = player === 'X' ? 'O' : 'X';
  setActivePlayerCard(currentPlayer);

  if (gameMode === 'pvai' && currentPlayer === 'O') {
    triggerAiMove();
  } else {
    setStatus(turnText(currentPlayer), currentPlayer.toLowerCase());
  }
}

function turnText(player) {
  if (gameMode === 'pvai') return player === 'X' ? 'Your turn' : "AI's turn";
  return `Player ${player}'s turn`;
}

function resultText(player) {
  if (gameMode === 'pvai') return player === 'X' ? 'You Win!' : 'AI Wins!';
  return `Player ${player} Wins!`;
}

/* ---------- AI ---------- */

function triggerAiMove() {
  aiThinking = true;
  setStatus('AI is thinking...', 'thinking');
  const delay = 300 + Math.random() * 200;
  aiTimeoutId = setTimeout(() => {
    aiThinking = false;
    if (!gameActive || gameMode !== 'pvai') return;
    const index = pickAiMove();
    applyMove(index, 'O', { isAiMove: true });
  }, delay);
}

function pickAiMove() {
  const empty = board.reduce((acc, v, i) => (v === '' ? [...acc, i] : acc), []);
  if (difficulty === 'hard') return pickBestMove();
  if (difficulty === 'medium') return pickMediumMove(empty);
  return pickRandomMove(empty);
}

function pickRandomMove(empty) {
  return empty[Math.floor(Math.random() * empty.length)];
}

function pickMediumMove(empty) {
  if (Math.random() < 0.3) return pickRandomMove(empty);

  for (const i of empty) {
    board[i] = 'O';
    const winsHere = getWinningCombo('O');
    board[i] = '';
    if (winsHere) return i;
  }
  for (const i of empty) {
    board[i] = 'X';
    const blocksHere = getWinningCombo('X');
    board[i] = '';
    if (blocksHere) return i;
  }
  return pickRandomMove(empty);
}

function pickBestMove() {
  let bestScore = -Infinity;
  let bestMove = null;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== '') continue;
    board[i] = 'O';
    const s = minimax(0, false, -Infinity, Infinity);
    board[i] = '';
    if (s > bestScore) {
      bestScore = s;
      bestMove = i;
    }
  }
  return bestMove;
}

function minimax(depth, isMaximizing, alpha, beta) {
  const winner = getWinnerOnBoard();
  if (winner === 'O') return 10 - depth;
  if (winner === 'X') return depth - 10;
  if (board.every(c => c !== '')) return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (board[i] !== '') continue;
      board[i] = 'O';
      best = Math.max(best, minimax(depth + 1, false, alpha, beta));
      board[i] = '';
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== '') continue;
    board[i] = 'X';
    best = Math.min(best, minimax(depth + 1, true, alpha, beta));
    board[i] = '';
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function getWinnerOnBoard() {
  for (const [a, b, c] of WIN_COMBOS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
  }
  return null;
}

/* ---------- Win detection & effects ---------- */

function getWinningCombo(player) {
  return WIN_COMBOS.find(combo => combo.every(i => board[i] === player)) || null;
}

function highlightWin(combo) {
  combo.forEach(i => boardEl.children[i].classList.add('cell-win'));
}

function lockBoard() {
  Array.from(boardEl.children).forEach(cell => { cell.disabled = true; });
}

function drawWinLine(combo, player) {
  const wrapRect = winLineEl.offsetParent.getBoundingClientRect();
  const startRect = boardEl.children[combo[0]].getBoundingClientRect();
  const endRect = boardEl.children[combo[2]].getBoundingClientRect();

  const startX = startRect.left + startRect.width / 2 - wrapRect.left;
  const startY = startRect.top + startRect.height / 2 - wrapRect.top;
  const endX = endRect.left + endRect.width / 2 - wrapRect.left;
  const endY = endRect.top + endRect.height / 2 - wrapRect.top;

  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  winLineEl.className = `win-line mark-${player.toLowerCase()}`;
  winLineEl.style.left = `${startX}px`;
  winLineEl.style.top = `${startY}px`;
  winLineEl.style.transform = `rotate(${angle}deg)`;
  winLineEl.style.width = '0px';
  requestAnimationFrame(() => {
    winLineEl.classList.add('visible');
    winLineEl.style.width = `${length}px`;
  });
}

function resetWinLine() {
  winLineEl.className = 'win-line';
  winLineEl.style.width = '0px';
}

/* ---------- Status & scoreboard ---------- */

function setStatus(text, tone, isResult = false) {
  statusEl.textContent = text;
  statusEl.classList.remove('status-x', 'status-o', 'status-draw', 'status-result', 'status-fade', 'status-thinking', 'status-hint');
  statusEl.classList.add(`status-${tone}`);
  if (isResult) statusEl.classList.add('status-result');
  void statusEl.offsetWidth;
  statusEl.classList.add('status-fade');
}

function setActivePlayerCard(player) {
  scoreXCard.classList.toggle('active-card', player === 'X');
  scoreOCard.classList.toggle('active-card', player === 'O');
}

function updateScore(changedKey) {
  scoreXEl.textContent = score.X;
  scoreOEl.textContent = score.O;
  scoreDrawsEl.textContent = score.draws;
  const changedEl = { X: scoreXEl, O: scoreOEl, draws: scoreDrawsEl }[changedKey];
  if (changedEl) bumpScore(changedEl);
}

function bumpScore(el) {
  el.classList.remove('score-bump');
  void el.offsetWidth;
  el.classList.add('score-bump');
}

function updateScoreLabels() {
  scoreXLabel.textContent = gameMode === 'pvai' ? 'You' : 'Player X';
  scoreOLabel.textContent = gameMode === 'pvai' ? 'AI' : 'Player O';
}

/* ---------- Mode & difficulty ---------- */

function setGameMode(mode) {
  gameMode = mode;
  const isAi = mode === 'pvai';

  modeThumbGame.classList.toggle('translate-x-full', isAi);
  modePvpBtn.classList.toggle('text-slate-950', !isAi);
  modePvpBtn.classList.toggle('text-slate-400', isAi);
  modePvpBtn.setAttribute('aria-selected', String(!isAi));
  modePvaiBtn.classList.toggle('text-slate-950', isAi);
  modePvaiBtn.classList.toggle('text-slate-400', !isAi);
  modePvaiBtn.setAttribute('aria-selected', String(isAi));

  difficultyDrawer.classList.toggle('grid-rows-[0fr]', !isAi);
  difficultyDrawer.classList.toggle('opacity-0', !isAi);
  difficultyDrawer.classList.toggle('grid-rows-[1fr]', isAi);
  difficultyDrawer.classList.toggle('opacity-100', isAi);

  updateScoreLabels();
  resetAll();
}

function setDifficulty(level) {
  difficulty = level;
  const positions = { easy: 0, medium: 1, hard: 2 };
  difficultyThumb.style.transform = `translateX(${positions[level] * 100}%)`;
  Object.entries(difficultyBtns).forEach(([key, btn]) => {
    const active = key === level;
    btn.classList.toggle('text-slate-950', active);
    btn.classList.toggle('text-slate-400', !active);
    btn.setAttribute('aria-selected', String(active));
  });
  hardBadge.classList.toggle('visible', level === 'hard');
  newRound();
}

/* ---------- Round & score reset ---------- */

function newRound() {
  clearTimeout(aiTimeoutId);
  aiThinking = false;
  board = Array(9).fill('');
  currentPlayer = 'X';
  gameActive = true;
  createBoard();
  resetWinLine();
  setStatus('Click any cell to start', 'hint');
  setActivePlayerCard('X');
}

function resetAll() {
  score = { X: 0, O: 0, draws: 0 };
  updateScore();
  newRound();
}

newRound();

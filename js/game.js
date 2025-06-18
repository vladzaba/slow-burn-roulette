// Insert number radio buttons
document.querySelector('.number-grid').innerHTML = Array.from({ length: 37 }, (_, i) => {
  return `<label><input type="radio" name="numberBet" value="${i}" ${i === 0 ? 'checked' : ''}><span>${i}</span></label>`;
}).join('');

// Game variables
const reds = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const wheel = Array.from({ length: 37 }, (_, n) => ({
  num: n,
  color: n === 0 ? 'green' : reds.has(n) ? 'red' : 'black'
}));
let remaining, order, balance = 1000;

// DOM refs
const balanceEl = document.getElementById('balance');
const oddsEl = document.getElementById('odds');
const board = document.getElementById('board');
const progress = document.getElementById('progress');
const speedSel = document.getElementById('speed');
const spinBtn = document.getElementById('spin');
const stakeIn = document.getElementById('stake');
const modal = document.getElementById('modal');
const resTitle = document.getElementById('resTitle');
const resDetail = document.getElementById('resDetail');
const againBtn = document.getElementById('playAgain');

// Tabs
document.querySelectorAll('.tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', 'false'));
    btn.setAttribute('aria-selected', 'true');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-panel').forEach(p => p.setAttribute('aria-hidden', p.id !== tab));
    updateOdds();
  });
});

// Init Board
function initBoard() {
  board.innerHTML = '';
  remaining = wheel.map(w => ({ ...w, removed: false }));
  wheel.forEach((w, i) => {
    const slot = document.createElement('div');
    slot.className = `slot ${w.color}`;
    slot.textContent = w.num;
    slot.dataset.idx = i;
    slot.setAttribute('role', 'gridcell');
    board.append(slot);
  });
  progress.style.width = '0%';
  updateOdds();
}

// Update Odds
function updateOdds() {
  const alive = remaining.filter(r => !r.removed);
  let wins = 0, total = alive.length;
  const tab = document.querySelector('.tabs button[aria-selected="true"]').dataset.tab;

  if (tab === 'color') {
    const c = document.querySelector('input[name="colorBet"]:checked').value;
    wins = alive.filter(r => r.color === c).length;
  } else if (tab === 'number') {
    const n = +document.querySelector('input[name="numberBet"]:checked').value;
    wins = alive.filter(r => r.num === n).length;
  } else {
    const s = document.querySelector('input[name="sideBet"]:checked').value;
    wins = alive.filter(r => {
      const n = r.num;
      if (s === 'odd') return n % 2 === 1;
      if (s === 'even') return n > 0 && n % 2 === 0;
      if (s === 'low') return n >= 1 && n <= 18;
      if (s === 'high') return n >= 19 && n <= 36;
      if (s === 'doz1') return n >= 1 && n <= 12;
      if (s === 'doz2') return n >= 13 && n <= 24;
      if (s === 'doz3') return n >= 25 && n <= 36;
    }).length;
  }

  const pct = total ? ((wins / total) * 100).toFixed(1) : 0;
  oddsEl.textContent = `${wins}/${total} (${pct}%)`;
  return { wins, total };
}

// Settle Game
function settle(winnerIdx, eliminated = false) {
  const stake = +stakeIn.value;
  let payout = 0, won = false;
  const tab = document.querySelector('.tabs button[aria-selected="true"]').dataset.tab;
  const winner = remaining[winnerIdx];

  if (tab === 'color') {
    const c = document.querySelector('input[name="colorBet"]:checked').value;
    won = c === winner.color;
    payout = won ? (winner.color === 'green' ? 36 : 2) * stake : 0;
  }

  if (tab === 'number') {
    if (eliminated) {
      won = false;
    } else {
      won = true;
      payout = 36 * stake;
    }
  }

  if (tab === 'side') {
    const s = document.querySelector('input[name="sideBet"]:checked').value;
    const map = { odd: 2, even: 2, low: 2, high: 2, doz1: 3, doz2: 3, doz3: 3 };
    const n = winner.num;
    let cond = false;
    if (s === 'odd') cond = n % 2 === 1;
    if (s === 'even') cond = n > 0 && n % 2 === 0;
    if (s === 'low') cond = n >= 1 && n <= 18;
    if (s === 'high') cond = n >= 19 && n <= 36;
    if (s === 'doz1') cond = n >= 1 && n <= 12;
    if (s === 'doz2') cond = n >= 13 && n <= 24;
    if (s === 'doz3') cond = n >= 25 && n <= 36;

    won = cond;
    payout = won ? map[s] * stake : 0;
  }

  balance += payout - stake;
  balanceEl.textContent = balance;
  resTitle.textContent = won ? '🎉 You Win!' : '💔 You Lose';
  resDetail.innerHTML = (won ? `You won ${payout}¢!` : `You lost ${stake}¢.`);
  modal.classList.add('active');
  spinBtn.disabled = false;
}

// Spin Game
function spin() {
  spinBtn.disabled = true;
  initBoard();
  order = remaining.map((_, i) => i).sort(() => Math.random() - 0.5);
  const delay = +speedSel.value;
  let step = 0;
  let { wins, total } = updateOdds();

  const tab = document.querySelector('.tabs button[aria-selected="true"]').dataset.tab;

  if (tab === 'number' && wins === 0) {
    const idx = order[0];
    document.querySelector(`.slot[data-idx="${idx}"]`).classList.add('eliminated');
    progress.style.width = `${(1 / order.length) * 100}%`;
    return settle(idx, true);
  }

  const timer = setInterval(() => {
    const idx = order[step];
    remaining[idx].removed = true;
    document.querySelector(`.slot[data-idx="${idx}"]`).classList.add('eliminated');
    step++;
    progress.style.width = `${(step / order.length) * 100}%`;

    ({ wins, total } = updateOdds());

    if (tab === 'number' && wins === 0) {
      clearInterval(timer);
      return settle(idx, true);
    }

    if (step >= order.length || wins === 0 || wins === total) {
      clearInterval(timer);
      const lastIdx = order[order.length - 1];
      document.querySelector(`.slot[data-idx="${lastIdx}"]`).classList.add('winner');
      progress.style.width = '100%';
      return settle(lastIdx, false);
    }
  }, delay);
}

// Events
spinBtn.addEventListener('click', spin);
againBtn.addEventListener('click', () => {
  modal.classList.remove('active');
  initBoard();
});
document.querySelectorAll('input, select').forEach(el => el.addEventListener('change', updateOdds));

// Init
balanceEl.textContent = balance;
initBoard();

// Game variables
const reds = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const wheel = Array.from({ length: 37 }, (_, n) => ({
  num: n,
  color: n === 0 ? 'green' : reds.has(n) ? 'red' : 'black'
}));
let remaining, order, balance = 1000;

// DOM references
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

// Set controls enabled/disabled
function setControlsEnabled(enabled) {
  document.querySelectorAll('input[name="numberBet"], input[name="colorBet"], input[name="sideBet"]').forEach(i => {
    i.disabled = !enabled;
  });
  stakeIn.disabled = !enabled;
  speedSel.disabled = !enabled;
  spinBtn.disabled = !enabled;
}

// Initialize board with numbers 0-36 in order
function initBoard() {
  board.innerHTML = '';
  remaining = wheel.map(w => ({ ...w, removed: false }));
  
  // Create slots in order (0-36)
  for (let num = 0; num <= 36; num++) {
    const slot = document.createElement('div');
    slot.className = `slot ${wheel[num].color}`;
    slot.textContent = num;
    slot.dataset.idx = num;
    slot.setAttribute('role','gridcell');
    board.append(slot);
  }
  
  progress.style.width = '0%';
  updateOdds();
}

// Update odds display
function updateOdds() {
  const alive = remaining.filter(r => !r.removed);
  let wins = 0, total = alive.length;

  // Check bet type
  const numberBet = document.querySelector('input[name="numberBet"]:checked');
  const colorBet = document.querySelector('input[name="colorBet"]:checked');
  const sideBet = document.querySelector('input[name="sideBet"]:checked');
  
  if (numberBet) {
    const n = +numberBet.value;
    wins = alive.filter(r => r.num === n).length;
  } 
  else if (colorBet) {
    const c = colorBet.value;
    wins = alive.filter(r => r.color === c).length;
  }
  else if (sideBet) {
    const s = sideBet.value;
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

  const pct = total ? ((wins/total)*100).toFixed(1) : '0.0';
  oddsEl.textContent = `${wins}/${total} (${pct}%)`;
  return { wins, total };
}

// Calculate and display results
function settle(winnerIdx, eliminated = false, betContext) {
  const stake = betContext.stake;
  const winner = remaining[winnerIdx];
  let payout = 0, won = false;

  // Number bet
  if (betContext.type === 'number') {
    won = !eliminated; 
    payout = won ? 36 * stake : 0;
  }
  // Color bet
  else if (betContext.type === 'color') {
    won = betContext.choice === winner.color;
    payout = won ? (winner.color === 'green' ? 36 : 2) * stake : 0;
  }
  // Side bet
  else {
    const map = { odd:2, even:2, low:2, high:2, doz1:3, doz2:3, doz3:3 };
    const n = winner.num;
    const s = betContext.choice;
    let cond = false;
    
    switch(s) {
      case 'odd': cond = n % 2 === 1; break;
      case 'even': cond = n > 0 && n % 2 === 0; break;
      case 'low': cond = n >= 1 && n <= 18; break;
      case 'high': cond = n >= 19 && n <= 36; break;
      case 'doz1': cond = n >= 1 && n <= 12; break;
      case 'doz2': cond = n >= 13 && n <= 24; break;
      case 'doz3': cond = n >= 25 && n <= 36; break;
    }
    
    won = cond;
    payout = won ? map[s] * stake : 0;
  }

  // Update balance and UI
  balance += payout - stake;
  balanceEl.textContent = balance;
  resTitle.textContent = won ? '🎉 You Win!' : '💔 You Lose';
  resDetail.innerHTML = won ? `You won ${payout}¢!` : `You lost ${stake}¢.`;
  modal.classList.add('active');
  setControlsEnabled(true);
}

// Deselect other bet groups
function deselectOtherBets(currentGroup) {
  const groups = ['numberBet', 'colorBet', 'sideBet'];
  groups.filter(group => group !== currentGroup).forEach(group => {
    document.querySelectorAll(`input[name="${group}"]`).forEach(input => {
      input.checked = false;
    });
  });
}

// Spin the wheel
function spin() {
  const stake = +stakeIn.value;
  if (stake > balance || stake <= 0) {
    return alert('Invalid or insufficient stake!');
  }

  // Check if any bet is placed
  const numberBet = document.querySelector('input[name="numberBet"]:checked');
  const colorBet = document.querySelector('input[name="colorBet"]:checked');
  const sideBet = document.querySelector('input[name="sideBet"]:checked');
  
  if (!numberBet && !colorBet && !sideBet) {
    return alert('Please place a bet!');
  }

  // Lock controls
  setControlsEnabled(false);

  // Capture bet context
  let betContext = {};
  
  if (numberBet) {
    betContext = { 
      type: 'number',
      choice: +numberBet.value, 
      stake 
    };
  } 
  else if (colorBet) {
    betContext = { 
      type: 'color',
      choice: colorBet.value, 
      stake 
    };
  }
  else if (sideBet) {
    betContext = { 
      type: 'side',
      choice: sideBet.value, 
      stake 
    };
  }

  initBoard();
  order = remaining.map((_, i) => i).sort(() => Math.random() - 0.5);
  const delay = +speedSel.value;
  let step = 0;
  let { wins, total } = updateOdds();

  // Immediate elimination if no possible wins
  if (betContext.type === 'number' && wins === 0) {
    const idx = order[0];
    document.querySelector(`.slot[data-idx="${idx}"]`).classList.add('eliminated');
    progress.style.width = `${(1/order.length)*100}%`;
    return settle(idx, true, betContext);
  }

  // Elimination animation
  const timer = setInterval(() => {
    const idx = order[step];
    remaining[idx].removed = true;
    document.querySelector(`.slot[data-idx="${idx}"]`).classList.add('eliminated');
    step++;
    progress.style.width = `${(step/order.length)*100}%`;

    ({ wins, total } = updateOdds());

    // Check for end conditions
    if (betContext.type === 'number' && wins === 0) {
      clearInterval(timer);
      return settle(idx, true, betContext);
    }
    if (step >= order.length || wins === 0 || wins === total) {
      clearInterval(timer);
      const lastIdx = order[order.length-1];
      document.querySelector(`.slot[data-idx="${lastIdx}"]`).classList.add('winner');
      progress.style.width = '100%';
      return settle(lastIdx, false, betContext);
    }
  }, delay);
}

// Event Listeners
spinBtn.addEventListener('click', spin);
againBtn.addEventListener('click', () => {
  modal.classList.remove('active');
  initBoard();
});

// Deselect other bet groups when a bet is selected
document.querySelectorAll('input[name="numberBet"]').forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) {
      deselectOtherBets('numberBet');
      updateOdds();
    }
  });
});

document.querySelectorAll('input[name="colorBet"]').forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) {
      deselectOtherBets('colorBet');
      updateOdds();
    }
  });
});

document.querySelectorAll('input[name="sideBet"]').forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) {
      deselectOtherBets('sideBet');
      updateOdds();
    }
  });
});

stakeIn.addEventListener('change', updateOdds);
speedSel.addEventListener('change', updateOdds);

// Initialize game
balanceEl.textContent = balance;
initBoard();
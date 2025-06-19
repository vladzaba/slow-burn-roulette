// Game variables
const reds = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const wheel = Array.from({ length: 37 }, (_, n) => ({
  num: n,
  color: n === 0 ? 'green' : reds.has(n) ? 'red' : 'black'
}));
let remaining, order, balance = 1000;

// Define the rows for the number elimination window layout
const row1 = [3,6,9,12,15,18,21,24,27,30,33,36];
const row2 = [2,5,8,11,14,17,20,23,26,29,32,35];
const row3 = [1,4,7,10,13,16,19,22,25,28,31,34];

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
  const controls = document.querySelectorAll(
    'input[name="numberBet"], input[name="colorBet"], input[name="sideBet"]'
  );
  
  controls.forEach(i => {
    i.disabled = !enabled;
    if (!enabled) {
      i.parentElement.classList.add('disabled');
      i.parentElement.querySelector('span').style.outline = 'none';
    } else {
      i.parentElement.classList.remove('disabled');
      i.parentElement.querySelector('span').style.outline = '';
    }
  });
  
  stakeIn.disabled = !enabled;
  speedSel.disabled = !enabled;
  spinBtn.disabled = !enabled;
  
  if (!enabled) {
    spinBtn.classList.add('disabled');
  } else {
    spinBtn.classList.remove('disabled');
  }
  
  // Add pointer-events control for hover prevention
  const elements = document.querySelectorAll(
    '.color-bet, .side-bet, .number-grid label'
  );
  elements.forEach(el => {
    if (!enabled) {
      el.classList.add('no-hover');
    } else {
      el.classList.remove('no-hover');
    }
  });
}

// Initialize board with numbers in the specified layout
function initBoard() {
  board.innerHTML = '';
  remaining = wheel.map(w => ({ ...w, removed: false }));
  
  // Create 0 slot
  const slot0 = document.createElement('div');
  slot0.className = `slot green zero`;
  slot0.textContent = 0;
  slot0.dataset.idx = 0;
  slot0.setAttribute('role', 'gridcell');
  board.append(slot0);
  
  // Create row1 slots
  row1.forEach(num => {
    const slot = document.createElement('div');
    slot.className = `slot ${wheel[num].color}`;
    slot.textContent = num;
    slot.dataset.idx = num;
    slot.setAttribute('role', 'gridcell');
    board.append(slot);
  });
  
  // Create row2 slots
  row2.forEach(num => {
    const slot = document.createElement('div');
    slot.className = `slot ${wheel[num].color}`;
    slot.textContent = num;
    slot.dataset.idx = num;
    slot.setAttribute('role', 'gridcell');
    board.append(slot);
  });
  
  // Create row3 slots
  row3.forEach(num => {
    const slot = document.createElement('div');
    slot.className = `slot ${wheel[num].color}`;
    slot.textContent = num;
    slot.dataset.idx = num;
    slot.setAttribute('role', 'gridcell');
    board.append(slot);
  });
  
  progress.style.width = '0%';
  updateOdds();
}

// Update odds display
function updateOdds() {
  const alive = remaining.filter(r => !r.removed);
  let wins = 0, total = alive.length;

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

  if (betContext.type === 'number') {
    won = !eliminated; 
    payout = won ? 36 * stake : 0;
  }
  else if (betContext.type === 'color') {
    won = betContext.choice === winner.color;
    payout = won ? (winner.color === 'green' ? 36 : 2) * stake : 0;
  }
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

// Apply bright colors to numbers
function applyBrightColors(numbers) {
  numbers.forEach(n => {
    const slot = document.querySelector(`.slot[data-idx="${n}"]`);
    if (slot) {
      if (slot.classList.contains('red')) {
        slot.classList.add('bright-red');
      } else if (slot.classList.contains('black')) {
        slot.classList.add('bright-black');
      } else if (slot.classList.contains('green')) {
        slot.classList.add('bright-green');
      }
    }
  });
}

// Clear hover effects
function clearHover() {
  document.querySelectorAll('.color-bet, .side-bet, .number-grid label').forEach(el => {
    el.classList.remove('hover');
  });
  
  document.querySelectorAll('.slot').forEach(slot => {
    slot.classList.remove('bright-red', 'bright-black', 'bright-green');
  });
}

// Handle bet hover
function handleBetHover(event, type, value) {
  if (spinBtn.disabled) return; // Skip if game is processing
  
  clearHover();
  event.currentTarget.classList.add('hover');
  
  if (type === 'color') {
    let numbers = [];
    if (value === 'red') {
      numbers = Array.from(reds);
    } else if (value === 'black') {
      numbers = Array.from({length: 36}, (_, i) => i+1).filter(n => !reds.has(n));
    } else if (value === 'green') {
      numbers = [0];
    }
    applyBrightColors(numbers);
  } 
  else if (type === 'side') {
    let numbers = [];
    switch(value) {
      case 'doz1': numbers = Array.from({length: 12}, (_, i) => i+1); break;
      case 'doz2': numbers = Array.from({length: 12}, (_, i) => i+13); break;
      case 'doz3': numbers = Array.from({length: 12}, (_, i) => i+25); break;
      case 'low': numbers = Array.from({length: 18}, (_, i) => i+1); break;
      case 'high': numbers = Array.from({length: 18}, (_, i) => i+19); break;
      case 'even': 
        numbers = Array.from({length: 36}, (_, i) => i+1).filter(n => n % 2 === 0);
        break;
      case 'odd':
        numbers = Array.from({length: 36}, (_, i) => i+1).filter(n => n % 2 === 1);
        break;
    }
    applyBrightColors(numbers);
  }
}

// Spin the wheel
function spin() {
  const stake = +stakeIn.value;
  if (stake > balance || stake <= 0) {
    return alert('Invalid or insufficient stake!');
  }

  const numberBet = document.querySelector('input[name="numberBet"]:checked');
  const colorBet = document.querySelector('input[name="colorBet"]:checked');
  const sideBet = document.querySelector('input[name="sideBet"]:checked');
  
  if (!numberBet && !colorBet && !sideBet) {
    return alert('Please place a bet!');
  }

  setControlsEnabled(false);
  clearHover();

  let betContext = {};
  
  if (numberBet) {
    betContext = { 
      type: 'number',
      choice: +numberBet.value, 
      stake 
    };
    // Add persistent selected class
    numberBet.parentElement.classList.add('selected');
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

  if (betContext.type === 'number' && wins === 0) {
    const idx = order[0];
    document.querySelector(`.slot[data-idx="${idx}"]`).classList.add('eliminated');
    progress.style.width = `${(1/order.length)*100}%`;
    return settle(idx, true, betContext);
  }

  const timer = setInterval(() => {
    const idx = order[step];
    remaining[idx].removed = true;
    document.querySelector(`.slot[data-idx="${idx}"]`).classList.add('eliminated');
    step++;
    progress.style.width = `${(step/order.length)*100}%`;

    ({ wins, total } = updateOdds());

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
  clearHover();
  document.querySelectorAll('.bets-section span').forEach(span => {
    span.style.outline = '';
  });
  // Clear selected classes
  document.querySelectorAll('.number-grid label').forEach(label => {
    label.classList.remove('selected');
  });
});

document.querySelectorAll('input[name="numberBet"]').forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) {
      deselectOtherBets('numberBet');
      updateOdds();
      applyBrightColors([parseInt(input.value)]);
      // Clear other selections and add selected class
      document.querySelectorAll('.number-grid label').forEach(label => {
        label.classList.remove('selected');
      });
      input.parentElement.classList.add('selected');
    }
  });
});

document.querySelectorAll('input[name="colorBet"]').forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) {
      deselectOtherBets('colorBet');
      updateOdds();
      let numbers = [];
      if (input.value === 'red') {
        numbers = Array.from(reds);
      } else if (input.value === 'black') {
        numbers = Array.from({length: 36}, (_, i) => i+1).filter(n => !reds.has(n));
      } else if (input.value === 'green') {
        numbers = [0];
      }
      applyBrightColors(numbers);
      // Clear number selections
      document.querySelectorAll('.number-grid label').forEach(label => {
        label.classList.remove('selected');
      });
    }
  });
});

document.querySelectorAll('input[name="sideBet"]').forEach(input => {
  input.addEventListener('change', () => {
    if (input.checked) {
      deselectOtherBets('sideBet');
      updateOdds();
      let numbers = [];
      switch(input.value) {
        case 'doz1': numbers = Array.from({length: 12}, (_, i) => i+1); break;
        case 'doz2': numbers = Array.from({length: 12}, (_, i) => i+13); break;
        case 'doz3': numbers = Array.from({length: 12}, (_, i) => i+25); break;
        case 'low': numbers = Array.from({length: 18}, (_, i) => i+1); break;
        case 'high': numbers = Array.from({length: 18}, (_, i) => i+19); break;
        case 'even': 
          numbers = Array.from({length: 36}, (_, i) => i+1).filter(n => n % 2 === 0);
          break;
        case 'odd':
          numbers = Array.from({length: 36}, (_, i) => i+1).filter(n => n % 2 === 1);
          break;
      }
      applyBrightColors(numbers);
      // Clear number selections
      document.querySelectorAll('.number-grid label').forEach(label => {
        label.classList.remove('selected');
      });
    }
  });
});

document.querySelectorAll('.color-bet').forEach(bet => {
  const input = bet.querySelector('input');
  bet.addEventListener('mouseenter', (e) => handleBetHover(e, 'color', input.value));
  bet.addEventListener('mouseleave', clearHover);
});

document.querySelectorAll('.side-bet').forEach(bet => {
  const input = bet.querySelector('input');
  bet.addEventListener('mouseenter', (e) => handleBetHover(e, 'side', input.value));
  bet.addEventListener('mouseleave', clearHover);
});

// Add hover to number grid
document.querySelectorAll('.number-grid label').forEach(label => {
  const input = label.querySelector('input');
  label.addEventListener('mouseenter', (e) => {
    if (spinBtn.disabled) return;
    clearHover();
    label.classList.add('hover');
    applyBrightColors([parseInt(input.value)]);
  });
  label.addEventListener('mouseleave', clearHover);
});

stakeIn.addEventListener('change', updateOdds);
speedSel.addEventListener('change', updateOdds);

// Initialize game
balanceEl.textContent = balance;
initBoard();
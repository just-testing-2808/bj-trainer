// main.js – App bootstrap, event wiring

import { state, initGame, startDeal, playerHit, playerStand, playerDouble, playerSplit,
         changeBet, toggleSideBet, resetGame, newShoe } from './game.js';
import { renderAll, animateChip, flashStatus, fmtEur } from './ui.js';

// ─── Init ─────────────────────────────────────────────────────────────────────

initGame();
renderAll();

// ─── Chip / Deal / New Round ──────────────────────────────────────────────────

document.getElementById('mainChip').addEventListener('click', () => {
  if (state.phase === 'betting') {
    if (state.currentBet > state.balance) {
      showToast('Nicht genug Balance!');
      return;
    }
    animateChip();
    const ok = startDeal();
    if (!ok) { showToast('Kein Deal möglich.'); return; }
    renderAll();
    if (state.phase === 'round_over') {
      flashResult();
    }
  } else if (state.phase === 'round_over') {
    state.phase = 'betting';
    state.dealerHand = [];
    state.playerHands = [[]];
    state.dealerHoleVisible = false;
    const dc = document.getElementById('dealerCards');
    const pa = document.getElementById('playerHandsArea');
    if (dc) { dc.innerHTML = ''; dc.dataset.renderKey = ''; }
    if (pa) pa.innerHTML = '';
    renderAll();
  }
});

// ─── Bet Controls ─────────────────────────────────────────────────────────────

document.getElementById('decreaseBet').addEventListener('click', () => { changeBet(-1); renderAll(); });
document.getElementById('increaseBet').addEventListener('click', () => { changeBet(+1); renderAll(); });

// ─── Action Buttons ───────────────────────────────────────────────────────────

document.getElementById('btnHit').addEventListener('click', () => {
  playerHit();
  renderAll();
  if (state.phase === 'round_over') flashResult();
});

document.getElementById('btnStand').addEventListener('click', () => {
  playerStand();
  renderAll();
  if (state.phase === 'round_over') flashResult();
});

document.getElementById('btnDouble').addEventListener('click', () => {
  playerDouble();
  renderAll();
  if (state.phase === 'round_over') flashResult();
});

document.getElementById('btnSplit').addEventListener('click', () => {
  playerSplit();
  renderAll();
});

function flashResult() {
  if (!state.lastRoundResult?.length) return;
  const r = state.lastRoundResult[0].result;
  if (r === 'win' || r === 'blackjack') flashStatus('win');
  else if (r === 'lose' || r === 'bust' || r === 'dealer_blackjack') flashStatus('lose');
  else flashStatus('push');
}

// ─── Side Bets ────────────────────────────────────────────────────────────────

document.querySelectorAll('.sidebet').forEach(el => {
  el.addEventListener('click', () => {
    toggleSideBet(el.dataset.bet);
    renderAll();
  });
});

// ─── Settings Panel ───────────────────────────────────────────────────────────

const settingsPanel = document.getElementById('settingsPanel');

document.getElementById('settingsBtn').addEventListener('click', e => {
  e.stopPropagation();
  const open = settingsPanel.classList.toggle('open');
  document.getElementById('helpPanel').classList.remove('open');
  if (open) syncSettingsUI();
});

function syncSettingsUI() {
  document.getElementById('chkLearning').checked      = state.settings.learningMode;
  document.getElementById('chkCounting').checked      = state.settings.showCountingPanel;
  document.getElementById('chkProbability').checked   = state.settings.showProbabilityPanel;
  document.getElementById('selStrategy').value        = state.settings.bettingStrategy;
  document.getElementById('inputBaseBet').value       = state.baseBet;
  document.getElementById('inputMinBet').value        = state.minBet;
  document.getElementById('inputMaxBet').value        = state.maxBet;
}

document.getElementById('chkLearning').addEventListener('change', e => {
  state.settings.learningMode = e.target.checked;
  renderAll();
});
document.getElementById('chkCounting').addEventListener('change', e => {
  state.settings.showCountingPanel = e.target.checked;
  renderAll();
});
document.getElementById('chkProbability').addEventListener('change', e => {
  state.settings.showProbabilityPanel = e.target.checked;
  renderAll();
});
document.getElementById('selStrategy').addEventListener('change', e => {
  state.settings.bettingStrategy = e.target.value;
});
document.getElementById('inputBaseBet').addEventListener('change', e => {
  state.baseBet = Math.max(parseFloat(e.target.value) || 10, state.minBet);
});
document.getElementById('inputMinBet').addEventListener('change', e => {
  state.minBet = Math.max(parseFloat(e.target.value) || 2.5, 0.5);
});
document.getElementById('inputMaxBet').addEventListener('change', e => {
  state.maxBet = Math.max(parseFloat(e.target.value) || 25000, state.minBet);
});

document.getElementById('btnResetGame').addEventListener('click', () => {
  if (confirm('Spiel zurücksetzen? Balance wird auf 1.000 € zurückgesetzt.')) {
    resetGame();
    settingsPanel.classList.remove('open');
    clearCards();
    renderAll();
    showToast('Spiel zurückgesetzt!');
  }
});

document.getElementById('btnNewShoe').addEventListener('click', () => {
  newShoe();
  renderAll();
  showToast('Neues Shoe gemischt! (' + state.settings.numDecks + ' Decks)');
});

// ─── Help Panel ───────────────────────────────────────────────────────────────

const helpPanel = document.getElementById('helpPanel');

document.getElementById('helpBtn').addEventListener('click', e => {
  e.stopPropagation();
  helpPanel.classList.toggle('open');
  settingsPanel.classList.remove('open');
});

// ─── Close panels on outside click ───────────────────────────────────────────

document.addEventListener('click', e => {
  if (!settingsPanel.contains(e.target) && e.target.id !== 'settingsBtn') {
    settingsPanel.classList.remove('open');
  }
  if (!helpPanel.contains(e.target) && e.target.id !== 'helpBtn') {
    helpPanel.classList.remove('open');
  }
});

// ─── Sound Toggle ─────────────────────────────────────────────────────────────

document.getElementById('soundBtn').addEventListener('click', () => {
  state.settings.soundEnabled = !state.settings.soundEnabled;
  document.getElementById('soundBtn').innerHTML = state.settings.soundEnabled
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
});

// ─── Refresh Button ───────────────────────────────────────────────────────────

document.getElementById('refreshBtn').addEventListener('click', () => {
  if (state.phase === 'betting' || state.phase === 'round_over') {
    state.phase = 'betting';
    clearCards();
    renderAll();
  } else {
    if (confirm('Aktuelle Runde abbrechen und neu beginnen?')) {
      state.phase = 'betting';
      state.balance += state.handBets.reduce((a, b) => a + b, 0); // refund bets
      clearCards();
      renderAll();
    }
  }
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearCards() {
  state.dealerHand = [];
  state.playerHands = [[]];
  state.dealerHoleVisible = false;
  const dc = document.getElementById('dealerCards');
  const pa = document.getElementById('playerHandsArea');
  if (dc) { dc.innerHTML = ''; dc.dataset.renderKey = ''; }
  if (pa) pa.innerHTML = '';
}

export function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

// main.js – App bootstrap, event wiring, animated dealing

import { state, initGame, startDeal, playerHit, playerStand, playerDouble, playerSplit,
         addToBet, clearBet, changeBet, toggleSideBet, resetGame, newShoe,
         startDealerPlay, dealerDrawOne, takeInsurance, declineInsurance }
  from './game.js';
import { renderAll, renderDealerHand, renderPlayerHands,
         animateChip, flashStatus, fmtEur } from './ui.js';

// ─── Init ─────────────────────────────────────────────────────────────────────────────────

initGame();
renderAll();

// ─── Animation guard ───────────────────────────────────────────────────────────────────

let isAnimating = false;

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── Sound (Web Audio, no external files) ────────────────────────────────────────────

let _audioCtx = null;
function getAudioCtx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

function playCardSound() {
  if (!state.settings.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(1100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(520, ctx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.13, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.14);
  } catch (_) {}
}

function playChipSound() {
  if (!state.settings.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(900, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(450, ctx.currentTime + 0.07);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.1);
  } catch (_) {}
}

function playWinSound() {
  if (!state.settings.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    [0, 0.12, 0.28].forEach((t, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = [880, 1100, 1320][i];
      gain.gain.setValueAtTime(0.12, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.2);
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.22);
    });
  } catch (_) {}
}

function playLoseSound() {
  if (!state.settings.soundEnabled) return;
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.35);
    gain.gain.setValueAtTime(0.09, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.4);
  } catch (_) {}
}

// ─── Win Popup / Game Toast ─────────────────────────────────────────────────────────

let _popupTimer = null;

function showWinPopup(amount, isBJ = false) {
  const popup = document.getElementById(isBJ ? 'bjPopup' : 'winPopup');
  const amtEl = document.getElementById(isBJ ? 'bjAmount' : 'winAmount');
  if (!popup) return;
  if (amtEl) amtEl.textContent = '+' + fmtEur(amount);
  popup.style.display = 'flex';
  requestAnimationFrame(() => popup.classList.add('show'));
  if (_popupTimer) clearTimeout(_popupTimer);
  _popupTimer = setTimeout(() => hideWinPopup(popup), 3000);
  popup.onclick = () => hideWinPopup(popup);
}

function hideWinPopup(popup) {
  if (!popup) return;
  popup.classList.remove('show');
  setTimeout(() => { popup.style.display = 'none'; }, 400);
}

function showGameToast(type) {
  const el = document.getElementById('gameToast');
  if (!el) return;
  el.className = 'game-toast game-toast-' + type;
  const msgs = { push: 'UNENTSCHIEDEN', lose: 'DEALER GEWINNT', bust: 'BUST!', dealer_blackjack: 'DEALER BLACKJACK' };
  el.textContent = msgs[type] || type.toUpperCase();
  el.style.display = 'block';
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => { el.style.display = 'none'; }, 400);
  }, 2800);
}

function showRoundResult() {
  if (!state.lastRoundResult?.length) return;
  const r = state.lastRoundResult[0].result;
  const win = state.lastRoundResult.reduce((a, b) => a + b.win, 0);
  if (r === 'blackjack') {
    showWinPopup(win, true); playWinSound(); flashStatus('win');
  } else if (r === 'win') {
    showWinPopup(win, false); playWinSound(); flashStatus('win');
  } else if (r === 'push') {
    showGameToast('push'); flashStatus('push');
  } else if (r === 'bust') {
    showGameToast('bust'); playLoseSound(); flashStatus('lose');
  } else if (r === 'dealer_blackjack') {
    showGameToast('dealer_blackjack'); playLoseSound(); flashStatus('lose');
  } else {
    showGameToast('lose'); playLoseSound(); flashStatus('lose');
  }
}

// ─── Animation helpers ─────────────────────────────────────────────────────────────────

function triggerHoleCardFlip() {
  const dealerCards = document.getElementById('dealerCards');
  if (!dealerCards) return;
  const holeEl = dealerCards.children[1];
  if (holeEl) {
    holeEl.classList.add('card-flip');
    setTimeout(() => holeEl.classList.remove('card-flip'), 600);
  }
}

async function animateDealSequence() {
  const isBJRound = state.phase === 'round_over';
  const origPhase = state.phase;
  const origHoleVisible = state.dealerHoleVisible;

  const p1 = state.playerHands[0][0];
  const p2 = state.playerHands[0][1];
  const d1 = state.dealerHand[0];
  const d2 = state.dealerHand[1];

  state.playerHands[0] = [];
  state.dealerHand = [];
  state.dealerHoleVisible = false;
  if (isBJRound) state.phase = 'dealing';
  renderAll();

  await sleep(220);
  state.dealerHand = [d1];
  renderDealerHand(); renderPlayerHands();
  playCardSound();

  await sleep(370);
  state.playerHands[0] = [p1];
  renderPlayerHands();
  playCardSound();

  await sleep(370);
  state.dealerHand = [d1, d2];
  renderDealerHand();
  playCardSound();

  await sleep(370);
  state.playerHands[0] = [p1, p2];
  renderPlayerHands();
  playCardSound();

  await sleep(280);

  state.dealerHoleVisible = origHoleVisible;
  state.phase = origPhase;
  renderAll();

  if (isBJRound && origHoleVisible) {
    await sleep(120);
    triggerHoleCardFlip();
  }
}

async function animateDealerTurn() {
  renderAll();
  triggerHoleCardFlip();

  await sleep(750);

  const needsDraw = startDealerPlay();
  if (!needsDraw) {
    renderAll();
    return;
  }

  while (state.phase === 'dealer_turn') {
    const morePossible = dealerDrawOne();
    renderAll();
    playCardSound();
    if (!morePossible) break;
    await sleep(720);
  }
}

// ─── Chip Tray ───────────────────────────────────────────────────────────────────────

document.querySelectorAll('.tray-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    if (isAnimating) return;
    if (state.phase !== 'betting' && state.phase !== 'round_over') return;
    const amount = parseFloat(btn.dataset.amount);
    const ok = addToBet(amount);
    if (!ok) { showToast('Limit erreicht!'); return; }
    playChipSound();
    btn.classList.remove('chip-place-anim');
    void btn.offsetWidth;
    btn.classList.add('chip-place-anim');
    setTimeout(() => btn.classList.remove('chip-place-anim'), 350);
    renderAll();
    updateDealBtn();
  });
});

document.getElementById('clearBetBtn').addEventListener('click', () => {
  if (isAnimating) return;
  if (state.phase !== 'betting' && state.phase !== 'round_over') return;
  clearBet();
  playChipSound();
  renderAll();
  updateDealBtn();
});

function updateDealBtn() {
  const btn = document.getElementById('dealBtn');
  if (!btn) return;
  const canDeal = (state.phase === 'betting' || state.phase === 'round_over') && state.currentBet >= state.minBet;
  btn.disabled = !canDeal;
}

// ─── Deal Button ──────────────────────────────────────────────────────────────────────

document.getElementById('dealBtn').addEventListener('click', async () => {
  if (isAnimating) return;

  if (state.phase === 'round_over') {
    // Start new round: reset table
    state.phase = 'betting';
    state.dealerHand = [];
    state.playerHands = [[]];
    state.dealerHoleVisible = false;
    clearCards();
    renderAll();
    updateDealBtn();
    return;
  }

  if (state.phase !== 'betting') return;
  if (state.currentBet < state.minBet) { showToast('Mindest-Einsatz: ' + fmtEur(state.minBet)); return; }

  isAnimating = true;
  playChipSound();

  const ok = startDeal();
  if (!ok) { showToast('Deal nicht möglich.'); isAnimating = false; return; }

  await animateDealSequence();

  // Insurance phase
  if (state.phase === 'insurance') {
    showInsuranceModal();
    isAnimating = false;
    return;
  }

  if (state.phase === 'dealer_turn') {
    await animateDealerTurn();
    showRoundResult();
    renderAll();
  } else if (state.phase === 'round_over') {
    showRoundResult();
    renderAll();
  }
  isAnimating = false;
  updateDealBtn();
});

// ─── Insurance Modal ────────────────────────────────────────────────────────────────

function showInsuranceModal() {
  const modal = document.getElementById('insuranceModal');
  const amtEl = document.getElementById('insuranceAmount');
  if (!modal) return;
  const insAmt = Math.floor(state.handBets[0] / 2);
  if (amtEl) amtEl.textContent = 'Versicherungseinsatz: ' + fmtEur(insAmt);
  modal.style.display = 'flex';
  requestAnimationFrame(() => modal.classList.add('show'));
}

function hideInsuranceModal() {
  const modal = document.getElementById('insuranceModal');
  if (!modal) return;
  modal.classList.remove('show');
  setTimeout(() => { modal.style.display = 'none'; }, 350);
}

document.getElementById('btnInsuranceYes').addEventListener('click', async () => {
  hideInsuranceModal();
  takeInsurance();
  renderAll();
  await continuePlayerTurn();
});

document.getElementById('btnInsuranceNo').addEventListener('click', async () => {
  hideInsuranceModal();
  declineInsurance();
  renderAll();
  await continuePlayerTurn();
});

async function continuePlayerTurn() {
  // Player turn is now active; nothing automated — buttons are live
  // If game jumped straight to round_over (edge case), show result
  if (state.phase === 'round_over') {
    showRoundResult();
    renderAll();
    updateDealBtn();
  }
}

// ─── Action Buttons ─────────────────────────────────────────────────────────────────

document.getElementById('btnHit').addEventListener('click', async () => {
  if (isAnimating || state.phase !== 'player_turn') return;
  isAnimating = true;
  playerHit();
  renderAll();
  playCardSound();
  if (state.phase === 'dealer_turn') {
    await sleep(450);
    await animateDealerTurn();
    showRoundResult(); renderAll();
  } else if (state.phase === 'round_over') {
    showRoundResult(); renderAll();
  }
  isAnimating = false;
  updateDealBtn();
});

document.getElementById('btnStand').addEventListener('click', async () => {
  if (isAnimating || state.phase !== 'player_turn') return;
  isAnimating = true;
  playerStand();
  if (state.phase === 'dealer_turn') {
    await animateDealerTurn();
    showRoundResult(); renderAll();
  } else if (state.phase === 'round_over') {
    renderAll(); showRoundResult();
  }
  isAnimating = false;
  updateDealBtn();
});

document.getElementById('btnDouble').addEventListener('click', async () => {
  if (isAnimating || state.phase !== 'player_turn') return;
  isAnimating = true;
  playerDouble();
  renderAll();
  playCardSound();
  await sleep(500);
  if (state.phase === 'dealer_turn') {
    await animateDealerTurn();
    showRoundResult(); renderAll();
  } else if (state.phase === 'round_over') {
    showRoundResult(); renderAll();
  }
  isAnimating = false;
  updateDealBtn();
});

document.getElementById('btnSplit').addEventListener('click', () => {
  if (isAnimating || state.phase !== 'player_turn') return;
  playerSplit();
  renderAll();
  playCardSound();
});

// ─── Side Bets ────────────────────────────────────────────────────────────────────────

document.querySelectorAll('.sidebet').forEach(el => {
  el.addEventListener('click', () => {
    if (isAnimating) return;
    toggleSideBet(el.dataset.bet);
    el.classList.remove('sidebet-activate');
    void el.offsetWidth;
    el.classList.add('sidebet-activate');
    setTimeout(() => el.classList.remove('sidebet-activate'), 400);
    playChipSound();
    renderAll();
  });
});

// ─── Settings Panel ─────────────────────────────────────────────────────────────────

const settingsPanel = document.getElementById('settingsPanel');

document.getElementById('settingsBtn').addEventListener('click', e => {
  e.stopPropagation();
  const open = settingsPanel.classList.toggle('open');
  document.getElementById('helpPanel').classList.remove('open');
  if (open) syncSettingsUI();
});

function syncSettingsUI() {
  document.getElementById('chkLearning').checked    = state.settings.learningMode;
  document.getElementById('chkCounting').checked    = state.settings.showCountingPanel;
  document.getElementById('chkProbability').checked = state.settings.showProbabilityPanel;
  document.getElementById('selStrategy').value      = state.settings.bettingStrategy;
  document.getElementById('inputBaseBet').value     = state.baseBet;
  document.getElementById('inputMinBet').value      = state.minBet;
  document.getElementById('inputMaxBet').value      = state.maxBet;

  document.querySelectorAll('.deck-btn').forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.decks) === state.settings.numDecks);
  });
  const nd = document.getElementById('newShoeLabel');
  if (nd) nd.textContent = state.settings.numDecks;

  const btnShoe = document.getElementById('btnNewShoe');
  if (btnShoe) {
    const locked = state.phase !== 'betting' && state.phase !== 'round_over';
    btnShoe.disabled = locked;
    btnShoe.title = locked ? 'Nur zwischen Runden möglich' : '';
  }
}

document.getElementById('chkLearning').addEventListener('change', e => {
  state.settings.learningMode = e.target.checked; renderAll();
});
document.getElementById('chkCounting').addEventListener('change', e => {
  state.settings.showCountingPanel = e.target.checked; renderAll();
});
document.getElementById('chkProbability').addEventListener('change', e => {
  state.settings.showProbabilityPanel = e.target.checked; renderAll();
});
document.getElementById('selStrategy').addEventListener('change', e => {
  state.settings.bettingStrategy = e.target.value;
});
document.getElementById('inputBaseBet').addEventListener('change', e => {
  state.baseBet = Math.max(parseFloat(e.target.value) || 10, state.minBet);
});
document.getElementById('inputMinBet').addEventListener('change', e => {
  state.minBet = Math.max(parseFloat(e.target.value) || 1, 0.5);
});
document.getElementById('inputMaxBet').addEventListener('change', e => {
  state.maxBet = Math.max(parseFloat(e.target.value) || 25000, state.minBet);
});

document.querySelectorAll('.deck-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const n = parseInt(btn.dataset.decks);
    state.settings.numDecks = n;
    document.querySelectorAll('.deck-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const nd = document.getElementById('newShoeLabel');
    if (nd) nd.textContent = n;
    showToast(`${n} Deck${n > 1 ? 's' : ''} beim nächsten Shoe aktiv`);
  });
});

document.getElementById('btnResetGame').addEventListener('click', () => {
  if (confirm('Spiel zurücksetzen? Balance wird auf 1.000 € zurückgesetzt.')) {
    resetGame();
    settingsPanel.classList.remove('open');
    clearCards();
    renderAll();
    updateDealBtn();
    showToast('Spiel zurückgesetzt!');
  }
});

document.getElementById('btnNewShoe').addEventListener('click', () => {
  if (state.phase !== 'betting' && state.phase !== 'round_over') {
    showToast('Nur zwischen Runden möglich!');
    return;
  }
  newShoe();
  renderAll();
  showToast(`Neues Shoe: ${state.settings.numDecks} Deck${state.settings.numDecks > 1 ? 's' : ''} (${state.shoe.length} Karten)`);
});

// ─── Help Panel ──────────────────────────────────────────────────────────────────────

const helpPanel = document.getElementById('helpPanel');

document.getElementById('helpBtn').addEventListener('click', e => {
  e.stopPropagation();
  helpPanel.classList.toggle('open');
  settingsPanel.classList.remove('open');
});

document.addEventListener('click', e => {
  if (!settingsPanel.contains(e.target) && e.target.id !== 'settingsBtn')
    settingsPanel.classList.remove('open');
  if (!helpPanel.contains(e.target) && e.target.id !== 'helpBtn')
    helpPanel.classList.remove('open');
});

// ─── Sound Toggle ────────────────────────────────────────────────────────────────────

document.getElementById('soundBtn').addEventListener('click', () => {
  state.settings.soundEnabled = !state.settings.soundEnabled;
  document.getElementById('soundBtn').innerHTML = state.settings.soundEnabled
    ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
});

// ─── Refresh Button ─────────────────────────────────────────────────────────────────

document.getElementById('refreshBtn').addEventListener('click', () => {
  if (isAnimating) return;
  if (state.phase === 'betting' || state.phase === 'round_over') {
    state.phase = 'betting'; clearCards(); clearBet(); renderAll(); updateDealBtn();
  } else {
    if (confirm('Aktuelle Runde abbrechen und neu beginnen?')) {
      state.phase = 'betting';
      state.balance += state.handBets.reduce((a, b) => a + b, 0);
      clearCards(); clearBet(); renderAll(); updateDealBtn();
    }
  }
});

// ─── Helpers ───────────────────────────────────────────────────────────────────────

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

// ui.js – All DOM rendering, driven purely by state

import { state, canDouble, canSplit } from './game.js';
import { getHandValue, isBlackjack, isBust, isSoftHand, SUIT_SYMBOLS } from './deck.js';
import { getBasicStrategy } from './strategy.js';
import { getProbabilityReport } from './probabilities.js';
import { getCountStats } from './counting.js';

// ─── Card Element ────────────────────────────────────────────────────────────

export function createCardElement(card, faceDown = false) {
  const el = document.createElement('div');
  el.classList.add('card');

  if (faceDown) {
    el.classList.add('face-down');
    el.innerHTML = `<div class="card-back-pattern"></div>`;
    return el;
  }

  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  el.classList.add(red ? 'card-red' : 'card-black');
  const sym = SUIT_SYMBOLS[card.suit];

  el.innerHTML = `
    <div class="card-corner tl">
      <div class="c-rank">${card.rank}</div>
      <div class="c-suit">${sym}</div>
    </div>
    <div class="card-center-suit">${sym}</div>
    <div class="card-corner br">
      <div class="c-rank">${card.rank}</div>
      <div class="c-suit">${sym}</div>
    </div>`;
  return el;
}

// ─── Dealer Hand ─────────────────────────────────────────────────────────────

export function renderDealerHand() {
  const container = document.getElementById('dealerCards');
  const scoreEl   = document.getElementById('dealerScore');
  if (!container) return;

  container.innerHTML = '';
  state.dealerHand.forEach((card, i) => {
    const faceDown = i === 1 && !state.dealerHoleVisible;
    const el = createCardElement(card, faceDown);
    el.classList.add('card-appear');
    container.appendChild(el);
  });

  if (scoreEl) {
    if (state.dealerHand.length === 0) {
      scoreEl.style.display = 'none';
    } else {
      scoreEl.style.display = 'flex';
      const visible = state.dealerHoleVisible
        ? state.dealerHand
        : [state.dealerHand[0]].filter(Boolean);
      const val = getHandValue(visible);
      scoreEl.textContent = isBlackjack(state.dealerHand) && state.dealerHoleVisible ? 'BJ' :
        val > 21 ? 'BUST' : val.toString();
      scoreEl.className = 'score-badge' +
        (getHandValue(state.dealerHand) > 21 && state.dealerHoleVisible ? ' bust' : '') +
        (isBlackjack(state.dealerHand) && state.dealerHoleVisible ? ' bj' : '');
    }
  }
}

// ─── Player Hands ─────────────────────────────────────────────────────────────

export function renderPlayerHands() {
  const area = document.getElementById('playerHandsArea');
  if (!area) return;

  area.innerHTML = '';
  state.playerHands.forEach((hand, hi) => {
    const wrap = document.createElement('div');
    wrap.className = 'player-hand' +
      (hi === state.activeHandIndex && state.phase === 'player_turn' ? ' active-hand' : '');

    const label = document.createElement('div');
    label.className = 'hand-label';
    label.textContent = state.playerHands.length > 1 ? `HAND ${hi + 1}` : 'YOUR HAND';
    wrap.appendChild(label);

    const cards = document.createElement('div');
    cards.className = 'cards-container';
    hand.forEach((card, ci) => {
      const el = createCardElement(card, false);
      el.style.setProperty('--i', ci);
      el.classList.add('card-appear');
      cards.appendChild(el);
    });
    wrap.appendChild(cards);

    if (hand.length > 0) {
      const score = document.createElement('div');
      const val = getHandValue(hand);
      let txt = val.toString();
      let cls = 'score-badge';
      if (val > 21)       { txt = 'BUST'; cls += ' bust'; }
      else if (val === 21) { txt = isBlackjack(hand) ? 'BJ!' : '21'; cls += ' bj'; }
      score.className = cls;
      score.textContent = txt;
      wrap.appendChild(score);
    }

    area.appendChild(wrap);
  });
}

// ─── Status Bar ───────────────────────────────────────────────────────────────

const PHASE_MSG = {
  betting:     'PLATZIERE DEINEN EINSATZ',
  dealing:     'DEALING...',
  player_turn: 'DEINE ENTSCHEIDUNG',
  insurance:   'VERSICHERUNG ANGEBOTEN',
  dealer_turn: "DEALER AM ZUG...",
  round_over:  ''
};

export function updateStatusBar() {
  const bar  = document.getElementById('statusBar');
  const text = document.getElementById('statusText');
  if (!bar || !text) return;

  bar.className = 'status-bar';

  if (state.phase === 'round_over' && state.lastRoundResult?.length) {
    const p = state.lastRoundResult[0];
    const map = {
      blackjack:        ['BLACKJACK! 3:2 ★', 'win'],
      win:              ['PLAYER WINS!', 'win'],
      bust:             ['BUST!', 'lose'],
      dealer_blackjack: ['DEALER BLACKJACK', 'lose'],
      lose:             ['DEALER WINS', 'lose'],
      push:             ['PUSH', 'push']
    };
    const [msg, cls] = map[p.result] || ['ROUND OVER', ''];
    text.textContent = msg;
    if (cls) bar.classList.add(cls);
  } else {
    text.textContent = PHASE_MSG[state.phase] || '';
  }
}

// ─── Buttons ──────────────────────────────────────────────────────────────────

export function updateButtons() {
  const isPlay = state.phase === 'player_turn';
  setBtn('btnHit',    !isPlay);
  setBtn('btnStand',  !isPlay);
  setBtn('btnDouble', !isPlay || !canDouble());
  setBtn('btnSplit',  !isPlay || !canSplit());
  // Hide action buttons entirely when not in player turn
  const ab = document.getElementById('actionButtons');
  if (ab) ab.style.opacity = isPlay ? '1' : '0.4';
}

function setBtn(id, disabled) {
  const el = document.getElementById(id);
  if (el) el.disabled = disabled;
}

// ─── Bet Area ─────────────────────────────────────────────────────────────────

export function updateBetArea() {
  const isBettingPhase = state.phase === 'betting' || state.phase === 'round_over';

  setText('betAmount', fmtEur(state.currentBet));

  const chipTray = document.getElementById('chipTray');
  if (chipTray) {
    chipTray.querySelectorAll('.tray-chip').forEach(btn => {
      const amount = parseFloat(btn.dataset.amount);
      btn.disabled = !isBettingPhase || state.currentBet + amount > state.balance;
    });
  }

  const clearBtn = document.getElementById('clearBetBtn');
  if (clearBtn) clearBtn.disabled = !isBettingPhase || state.currentBet === 0;

  const dealBtn = document.getElementById('dealBtn');
  if (dealBtn) {
    if (state.phase === 'round_over') {
      dealBtn.textContent = 'NEUE RUNDE';
      dealBtn.disabled = false;
    } else {
      dealBtn.textContent = 'DEAL';
      dealBtn.disabled = !isBettingPhase || state.currentBet < state.minBet;
    }
  }
}

// ─── Panels ───────────────────────────────────────────────────────────────────

export function updateBalancePanels() {
  setText('balanceDisplay', fmtEur(state.balance));
  setText('lastWinDisplay', fmtEur(state.lastWin));
}

export function updateSideBets() {
  const isBetting = state.phase === 'betting';
  Object.entries(state.selectedSideBets).forEach(([key, active]) => {
    const el = document.querySelector(`[data-bet="${key}"]`);
    if (!el) return;
    el.classList.toggle('active', active);
    el.classList.toggle('sidebet-disabled', !isBetting);
  });
}

// ─── Counting Panel ────────────────────────────────────────────────────────────

export function updateCountingPanel() {
  const panel = document.getElementById('countingPanel');
  if (!panel) return;
  panel.style.display = state.settings.showCountingPanel ? 'block' : 'none';
  if (!state.settings.showCountingPanel) return;

  const s = getCountStats(state);
  const rc = s.runningCount;
  const tc = s.trueCount;
  setText('cpRunning', rc >= 0 ? `+${rc}` : `${rc}`);
  setText('cpTrue',    tc >= 0 ? `+${tc}` : `${tc}`);
  setText('cpCards',   s.cardsRemaining);
  setText('cpDecks',   s.decksRemaining.toFixed(1));
  setText('cpHigh',    s.highCardsRemaining);
  setText('cpLow',     s.lowCardsRemaining);
  setText('cpAces',    s.acesRemaining);

  const rcEl = document.getElementById('cpRunning');
  const tcEl = document.getElementById('cpTrue');
  if (rcEl) rcEl.className = 'count-value' + (rc > 0 ? ' positive' : rc < 0 ? ' negative' : '');
  if (tcEl) tcEl.className = 'count-value' + (tc > 0 ? ' positive' : tc < 0 ? ' negative' : '');
}

// ─── Probability Panel ─────────────────────────────────────────────────────────

export function updateProbabilityPanel() {
  const panel = document.getElementById('probabilityPanel');
  if (!panel) return;
  const show = state.settings.showProbabilityPanel && state.phase === 'player_turn';
  panel.style.display = show ? 'block' : 'none';
  if (!show) return;

  const hand = state.playerHands[state.activeHandIndex];
  const dealerUp = state.dealerHand[0];
  const report = getProbabilityReport(hand, dealerUp, state.shoe);
  if (!report) return;

  setText('probBust',       pct(report.bustOnHit));
  setText('prob21',         pct(report.hit21));
  setText('probDealerBust', pct(report.dealerBust));
  if (report.shoeStats) {
    setText('probTens', `${report.shoeStats.tens} (${report.shoeStats.tenPercent}%)`);
    setText('probAces', `${report.shoeStats.aces} (${report.shoeStats.acePercent}%)`);
  }
}

// ─── Learning Panel ────────────────────────────────────────────────────────────

export function updateLearningPanel() {
  const panel = document.getElementById('learningPanel');
  if (!panel) return;
  const show = state.settings.learningMode && state.phase === 'player_turn';
  panel.style.display = show ? 'block' : 'none';
  if (!show) return;

  const hand    = state.playerHands[state.activeHandIndex];
  const dealerUp = state.dealerHand[0];
  const strat   = getBasicStrategy(hand, dealerUp, canDouble(), canSplit());
  if (!strat) return;

  const actionEl = document.getElementById('learnAction');
  const reasonEl = document.getElementById('learnReason');
  if (actionEl) {
    actionEl.textContent = strat.action.toUpperCase();
    actionEl.className   = `learn-action learn-${strat.action}`;
  }
  if (reasonEl) reasonEl.textContent = strat.reason;
}

// ─── Full Render ───────────────────────────────────────────────────────────────

export function renderAll() {
  renderDealerHand();
  renderPlayerHands();
  updateStatusBar();
  updateButtons();
  updateBetArea();
  updateBalancePanels();
  updateSideBets();
  updateCountingPanel();
  updateProbabilityPanel();
  updateLearningPanel();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmtEur(amount) {
  if (amount == null) return '0,00 €';
  return amount.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function pct(v) {
  return `${Math.round((v || 0) * 100)}%`;
}

export function animateChip() {
  const chip = document.getElementById('mainChip');
  if (!chip) return;
  chip.classList.remove('chip-pulse');
  void chip.offsetWidth;
  chip.classList.add('chip-pulse');
  setTimeout(() => chip.classList.remove('chip-pulse'), 400);
}

export function flashStatus(type) {
  const bar = document.getElementById('statusBar');
  if (!bar) return;
  bar.classList.remove('flash-win', 'flash-lose', 'flash-push');
  void bar.offsetWidth;
  bar.classList.add(`flash-${type}`);
  setTimeout(() => bar.classList.remove(`flash-win`, `flash-lose`, `flash-push`), 700);
}

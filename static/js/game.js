// game.js – Central game state and all game logic

import { createShoe, dealCard, getHandValue, isBlackjack, isBust, isPair } from './deck.js';
import { updateCount, resetCount, calcTrueCount } from './counting.js';
import { evaluateAllSideBets } from './sidebets.js';
import { getNextBet, clamp } from './betting.js';

export const state = {
  shoe: [],
  discardPile: [],

  dealerHand: [],
  dealerHoleVisible: false,

  playerHands: [[]],
  activeHandIndex: 0,
  handBets: [10],

  phase: 'betting', // betting | dealing | player_turn | dealer_turn | round_over

  balance: 1000,
  currentBet: 10,
  baseBet: 10,
  minBet: 2.5,
  maxBet: 25000,
  lastWin: 0,
  sideBetAmount: 5,

  selectedSideBets: {
    twentyOnePlusThree: false,
    bustBonus: false,
    perfectPairs: false,
    crazySeven: false
  },

  runningCount: 0,
  trueCount: 0,

  roundHistory: [],
  lastRoundResult: null,

  settings: {
    learningMode: false,
    showCountingPanel: false,
    showProbabilityPanel: false,
    bettingStrategy: 'manual',
    soundEnabled: true,
    numDecks: 6
  }
};

export function initGame() {
  state.shoe = createShoe(state.settings.numDecks);
  state.discardPile = [];
  resetCount(state);
}

function reshuffleIfNeeded() {
  const minCards = Math.floor(state.settings.numDecks * 52 * 0.25);
  if (state.shoe.length < minCards) {
    state.shoe = createShoe(state.settings.numDecks);
    state.discardPile = [];
    resetCount(state);
    return true;
  }
  return false;
}

function calcActiveSideBets() {
  return Object.values(state.selectedSideBets).filter(Boolean).length * state.sideBetAmount;
}

export function startDeal() {
  if (state.phase !== 'betting') return false;
  const totalCost = state.currentBet + calcActiveSideBets();
  if (totalCost > state.balance) return false;

  reshuffleIfNeeded();
  state.phase = 'dealing';

  state.dealerHand = [];
  state.dealerHoleVisible = false;
  state.playerHands = [[]];
  state.activeHandIndex = 0;
  state.handBets = [state.currentBet];
  state.lastRoundResult = null;

  state.balance -= totalCost;

  // Deal: player card 1, dealer card 1 (up), player card 2, dealer card 2 (hole)
  const p1 = dealCard(state.shoe);
  const d1 = dealCard(state.shoe);
  const p2 = dealCard(state.shoe);
  const d2 = dealCard(state.shoe);

  state.playerHands[0] = [p1, p2];
  state.dealerHand = [d1, d2];

  // Count visible cards only (p1, d1, p2) – NOT the hole card d2
  updateCount(state, p1);
  updateCount(state, d1);
  updateCount(state, p2);

  const playerBJ = isBlackjack(state.playerHands[0]);
  const dealerBJ = isBlackjack(state.dealerHand);

  if (playerBJ || dealerBJ) {
    revealHoleCard();
    endRound();
    return true;
  }

  state.phase = 'player_turn';
  return true;
}

export function playerHit() {
  if (state.phase !== 'player_turn') return;
  const card = dealCard(state.shoe);
  if (!card) return;
  state.playerHands[state.activeHandIndex].push(card);
  updateCount(state, card);

  const val = getHandValue(state.playerHands[state.activeHandIndex]);
  if (val >= 21) advanceOrEndPlayerTurn();
}

export function playerStand() {
  if (state.phase !== 'player_turn') return;
  advanceOrEndPlayerTurn();
}

export function playerDouble() {
  if (state.phase !== 'player_turn') return;
  const hand = state.playerHands[state.activeHandIndex];
  if (hand.length !== 2) return;
  const extraBet = state.handBets[state.activeHandIndex];
  if (state.balance < extraBet) return;

  state.balance -= extraBet;
  state.handBets[state.activeHandIndex] *= 2;

  const card = dealCard(state.shoe);
  if (!card) return;
  hand.push(card);
  updateCount(state, card);

  advanceOrEndPlayerTurn();
}

export function playerSplit() {
  if (state.phase !== 'player_turn') return;
  const hand = state.playerHands[state.activeHandIndex];
  if (!isPair(hand) || state.playerHands.length >= 4) return;
  const splitBet = state.handBets[state.activeHandIndex];
  if (state.balance < splitBet) return;

  state.balance -= splitBet;

  const [c1, c2] = hand;
  const nc1 = dealCard(state.shoe);
  const nc2 = dealCard(state.shoe);
  if (!nc1 || !nc2) return;

  updateCount(state, nc1);
  updateCount(state, nc2);

  state.playerHands[state.activeHandIndex] = [c1, nc1];
  state.playerHands.splice(state.activeHandIndex + 1, 0, [c2, nc2]);
  state.handBets.splice(state.activeHandIndex + 1, 0, splitBet);
  // Stay on same hand index to play the first split hand
}

function advanceOrEndPlayerTurn() {
  if (state.activeHandIndex < state.playerHands.length - 1) {
    state.activeHandIndex++;
  } else {
    revealHoleCard();
    runDealerTurn();
  }
}

function revealHoleCard() {
  state.dealerHoleVisible = true;
  // Now count the hole card
  updateCount(state, state.dealerHand[1]);
}

function runDealerTurn() {
  state.phase = 'dealer_turn';
  let dv = getHandValue(state.dealerHand);
  while (dv < 17) {
    const card = dealCard(state.shoe);
    if (!card) break;
    state.dealerHand.push(card);
    updateCount(state, card);
    dv = getHandValue(state.dealerHand);
  }
  endRound();
}

function endRound() {
  state.phase = 'round_over';
  const dv = getHandValue(state.dealerHand);
  const dealerBust = dv > 21;
  const dealerBJ = isBlackjack(state.dealerHand);

  let totalWin = 0;
  const results = [];

  for (let i = 0; i < state.playerHands.length; i++) {
    const hand = state.playerHands[i];
    const bet = state.handBets[i];
    const hv = getHandValue(hand);
    const playerBust = hv > 21;
    // Blackjack only counts on unsplit original hand
    const playerBJ = isBlackjack(hand) && state.playerHands.length === 1;

    let result;
    let win = 0;

    if (playerBust) {
      result = 'bust';
    } else if (playerBJ && dealerBJ) {
      result = 'push';
      win = bet;
      state.balance += win;
    } else if (playerBJ) {
      result = 'blackjack';
      win = bet + Math.floor(bet * 1.5); // 3:2 payout
      state.balance += win;
    } else if (dealerBJ) {
      result = 'dealer_blackjack';
    } else if (dealerBust) {
      result = 'win';
      win = bet * 2;
      state.balance += win;
    } else if (hv > dv) {
      result = 'win';
      win = bet * 2;
      state.balance += win;
    } else if (hv === dv) {
      result = 'push';
      win = bet;
      state.balance += win;
    } else {
      result = 'lose';
    }

    totalWin += win;
    results.push({ result, win, handValue: hv, bet });
  }

  // Side bets evaluated on top of main result
  const sideBetWin = evaluateAllSideBets(state);
  if (sideBetWin > 0) {
    // Return stake + winnings for active side bets
    const activeSideBets = Object.values(state.selectedSideBets).filter(Boolean).length;
    const sideBetStake = activeSideBets * state.sideBetAmount;
    state.balance += sideBetWin + sideBetStake;
    totalWin += sideBetWin;
  }

  state.lastWin = totalWin;
  state.lastRoundResult = results;
  state.roundHistory.push({ results, sideBetWin, ts: Date.now() });

  // Auto-update bet for non-manual strategies
  const nextBet = getNextBet(state, results);
  if (state.settings.bettingStrategy !== 'manual') {
    state.currentBet = nextBet;
  }
  state.currentBet = clamp(state.currentBet, state.minBet, Math.min(state.maxBet, state.balance));
}

export function changeBet(delta) {
  if (state.phase !== 'betting') return;
  const steps = [2.5, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
  let idx = steps.findIndex(s => s >= state.currentBet);
  if (idx === -1) idx = steps.length - 1;
  idx = clamp(idx + delta, 0, steps.length - 1);
  state.currentBet = clamp(steps[idx], state.minBet, Math.min(state.maxBet, state.balance));
}

export function toggleSideBet(name) {
  if (state.phase !== 'betting') return;
  if (name in state.selectedSideBets) {
    state.selectedSideBets[name] = !state.selectedSideBets[name];
  }
}

export function resetGame() {
  state.balance = 1000;
  state.currentBet = 10;
  state.baseBet = 10;
  state.lastWin = 0;
  state.phase = 'betting';
  state.roundHistory = [];
  state.lastRoundResult = null;
  state.dealerHand = [];
  state.playerHands = [[]];
  state.dealerHoleVisible = false;
  state.selectedSideBets = { twentyOnePlusThree: false, bustBonus: false, perfectPairs: false, crazySeven: false };
  initGame();
}

export function newShoe() {
  state.shoe = createShoe(state.settings.numDecks);
  state.discardPile = [];
  resetCount(state);
}

export function canDouble() {
  if (state.phase !== 'player_turn') return false;
  const hand = state.playerHands[state.activeHandIndex];
  return hand.length === 2 && state.balance >= state.handBets[state.activeHandIndex];
}

export function canSplit() {
  if (state.phase !== 'player_turn') return false;
  const hand = state.playerHands[state.activeHandIndex];
  return isPair(hand) && state.balance >= state.handBets[state.activeHandIndex] && state.playerHands.length < 4;
}

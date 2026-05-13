// sidebets.js – Side bet evaluation
// All payouts are net winnings (bet returned separately where noted)

import { getHandValue } from './deck.js';

function isRed(card) {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

function rankIndex(rank) {
  return ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'].indexOf(rank);
}

// Perfect Pairs payouts:
//   Mixed pair (diff color, diff suit): 5:1
//   Colored pair (same color, diff suit): 10:1
//   Perfect pair (same suit): 25:1
export function evaluatePerfectPairs(playerHand, betAmount) {
  if (!playerHand || playerHand.length < 2) return 0;
  const [c1, c2] = playerHand;
  if (c1.rank !== c2.rank) return 0;
  if (c1.suit === c2.suit) return betAmount * 25;       // perfect pair
  if (isRed(c1) === isRed(c2)) return betAmount * 10;  // colored pair
  return betAmount * 5;                                  // mixed pair
}

// 21+3 payouts: player 2 cards + dealer upcard
//   Flush: 5:1 | Straight: 10:1 | Three of a Kind: 30:1 | Straight Flush: 40:1
export function evaluate21Plus3(playerHand, dealerUpcard, betAmount) {
  if (!playerHand || playerHand.length < 2 || !dealerUpcard) return 0;
  const cards = [playerHand[0], playerHand[1], dealerUpcard];
  const suits = cards.map(c => c.suit);
  const ranks = cards.map(c => c.rank);
  const vals = cards.map(c => rankIndex(c.rank)).sort((a, b) => a - b);

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isToak = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const diff = vals[2] - vals[0];
  // Straight check including A-high wrap (Q-K-A)
  const isStraight = (diff === 2 && vals[1] - vals[0] === 1) ||
    (vals[0] === 0 && vals[1] === 11 && vals[2] === 12);

  if (isToak) return betAmount * 30;
  if (isFlush && isStraight) return betAmount * 40;
  if (isFlush) return betAmount * 5;
  if (isStraight) return betAmount * 10;
  return 0;
}

// Crazy 7 payouts:
//   One 7: 3:1 | Two 7s (diff suits): 50:1 | Two 7s (same suit): 100:1
export function evaluateCrazySeven(playerHand, betAmount) {
  const sevens = playerHand.filter(c => c.rank === '7');
  if (sevens.length === 0) return 0;
  if (sevens.length >= 2) {
    return sevens[0].suit === sevens[1].suit ? betAmount * 100 : betAmount * 50;
  }
  return betAmount * 3;
}

// Bust Bonus payouts (dealer bust):
//   3-card bust: 1:1 | 4-card: 2:1 | 5-card: 3:1 | 6-card: 5:1 | 7+: 10:1
export function evaluateBustBonus(dealerHand, dealerBusted, betAmount) {
  if (!dealerBusted) return 0;
  const n = dealerHand.length;
  if (n === 3) return betAmount * 1;
  if (n === 4) return betAmount * 2;
  if (n === 5) return betAmount * 3;
  if (n === 6) return betAmount * 5;
  return betAmount * 10;
}

export function evaluateAllSideBets(state) {
  const { selectedSideBets, playerHands, dealerHand, sideBetAmount } = state;
  if (!playerHands || playerHands.length === 0) return 0;

  const playerHand = playerHands[0];
  const dealerUpcard = dealerHand[0];
  const dealerBusted = getHandValue(dealerHand) > 21;
  let total = 0;

  if (selectedSideBets.perfectPairs)
    total += evaluatePerfectPairs(playerHand, sideBetAmount);
  if (selectedSideBets.twentyOnePlusThree)
    total += evaluate21Plus3(playerHand, dealerUpcard, sideBetAmount);
  if (selectedSideBets.crazySeven)
    total += evaluateCrazySeven(playerHand, sideBetAmount);
  if (selectedSideBets.bustBonus)
    total += evaluateBustBonus(dealerHand, dealerBusted, sideBetAmount);

  return total;
}

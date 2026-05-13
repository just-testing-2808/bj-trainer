// probabilities.js – Real-shoe probability calculations

import { getHandValue } from './deck.js';

export function calcBustProbability(playerHand, shoe) {
  if (!shoe || shoe.length === 0) return 0;
  const bustCards = shoe.filter(c => getHandValue([...playerHand, c]) > 21);
  return bustCards.length / shoe.length;
}

export function calcHit21Probability(playerHand, shoe) {
  if (!shoe || shoe.length === 0) return 0;
  const cards21 = shoe.filter(c => getHandValue([...playerHand, c]) === 21);
  return cards21.length / shoe.length;
}

export function calcTenValueRemaining(shoe) {
  return shoe.filter(c => c.value === 10).length;
}

export function calcAcesRemaining(shoe) {
  return shoe.filter(c => c.rank === 'A').length;
}

// Rough dealer bust probability based on upcard (empirically derived)
const DEALER_BUST_TABLE = {
  2: 0.353, 3: 0.374, 4: 0.401, 5: 0.423, 6: 0.423,
  7: 0.262, 8: 0.238, 9: 0.230, 10: 0.232, 11: 0.174
};

export function calcDealerBustProbability(dealerUpcard) {
  if (!dealerUpcard) return 0;
  const uv = dealerUpcard.rank === 'A' ? 11 : Math.min(dealerUpcard.value, 10);
  return DEALER_BUST_TABLE[uv] || 0.25;
}

export function getShoeStats(shoe) {
  if (!shoe || shoe.length === 0) return null;
  const total = shoe.length;
  const tens = shoe.filter(c => c.value === 10).length;
  const aces = shoe.filter(c => c.rank === 'A').length;
  const low = shoe.filter(c => ['2', '3', '4', '5', '6'].includes(c.rank)).length;
  return {
    total,
    tens,
    aces,
    lowCards: low,
    tenPercent: Math.round(tens / total * 100),
    acePercent: Math.round(aces / total * 100)
  };
}

export function getProbabilityReport(playerHand, dealerUpcard, shoe) {
  if (!playerHand || playerHand.length < 2 || !shoe) return null;
  return {
    bustOnHit: calcBustProbability(playerHand, shoe),
    hit21: calcHit21Probability(playerHand, shoe),
    dealerBust: calcDealerBustProbability(dealerUpcard),
    shoeStats: getShoeStats(shoe)
  };
}

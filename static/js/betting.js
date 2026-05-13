// betting.js – Betting strategy calculators (pure functions)

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function getFlatBet(state) {
  return clamp(state.baseBet, state.minBet, Math.min(state.maxBet, state.balance));
}

export function getMartingaleBet(state, lastResults) {
  const base = clamp(state.baseBet, state.minBet, Math.min(state.maxBet, state.balance));
  if (!lastResults || lastResults.length === 0) return base;

  const primary = lastResults[0];
  if (primary.result === 'push') {
    // Keep current bet on push
    return clamp(state.currentBet, state.minBet, Math.min(state.maxBet, state.balance));
  }
  if (primary.result === 'lose' || primary.result === 'bust' || primary.result === 'dealer_blackjack') {
    // Double after loss
    const doubled = state.currentBet * 2;
    return clamp(doubled, state.minBet, Math.min(state.maxBet, state.balance));
  }
  // Win or blackjack: return to base
  return base;
}

export function getTrueCountBet(state) {
  const { baseBet, minBet, maxBet, balance, trueCount } = state;
  let bet;
  if (trueCount <= 0) bet = minBet;
  else if (trueCount >= 4) bet = baseBet * 4;
  else bet = baseBet * trueCount;
  return clamp(bet, minBet, Math.min(maxBet, balance));
}

export function getNextBet(state, lastResults) {
  switch (state.settings.bettingStrategy) {
    case 'flat':       return getFlatBet(state);
    case 'martingale': return getMartingaleBet(state, lastResults);
    case 'trueCount':  return getTrueCountBet(state);
    default:           return state.currentBet; // manual
  }
}

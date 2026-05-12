// counting.js – Hi-Lo card counting system

export function getHiLoValue(card) {
  if (!card) return 0;
  if (['2', '3', '4', '5', '6'].includes(card.rank)) return 1;
  if (['7', '8', '9'].includes(card.rank)) return 0;
  return -1; // 10, J, Q, K, A
}

// Updates running count and true count in state
export function updateCount(state, card) {
  if (!card) return;
  state.runningCount += getHiLoValue(card);
  state.trueCount = calcTrueCount(state);
}

export function calcTrueCount(state) {
  const decksRemaining = Math.max(state.shoe.length / 52, 0.5);
  return Math.round((state.runningCount / decksRemaining) * 10) / 10;
}

export function resetCount(state) {
  state.runningCount = 0;
  state.trueCount = 0;
}

export function getCountStats(state) {
  const shoe = state.shoe;
  let highCards = 0;
  let lowCards = 0;
  let aces = 0;
  for (const card of shoe) {
    const v = getHiLoValue(card);
    if (v === -1) highCards++;
    else if (v === 1) lowCards++;
    if (card.rank === 'A') aces++;
  }
  return {
    runningCount: state.runningCount,
    trueCount: state.trueCount,
    cardsRemaining: shoe.length,
    decksRemaining: Math.round(shoe.length / 52 * 10) / 10,
    highCardsRemaining: highCards,
    lowCardsRemaining: lowCards,
    acesRemaining: aces
  };
}

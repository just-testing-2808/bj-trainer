// strategy.js – Basic strategy engine
// Returns { action: 'hit'|'stand'|'double'|'split', reason: string }

import { getHandValue, isSoftHand, isPair } from './deck.js';

function dv(dealerUpcard) {
  if (!dealerUpcard) return 0;
  if (dealerUpcard.rank === 'A') return 11;
  return Math.min(dealerUpcard.value, 10);
}

export function getBasicStrategy(playerHand, dealerUpcard, canDouble = true, canSplit = true) {
  const d = dv(dealerUpcard);
  const soft = isSoftHand(playerHand);
  const pair = isPair(playerHand);

  if (pair && canSplit) {
    const r = pairStrategy(playerHand[0].rank, d, canDouble);
    if (r) return r;
  }

  if (soft) {
    const r = softStrategy(playerHand, d, canDouble);
    if (r) return r;
  }

  return hardStrategy(getHandValue(playerHand), d, canDouble);
}

function pairStrategy(rank, d, canDouble) {
  switch (rank) {
    case 'A':
      return { action: 'split', reason: `Asse immer splitten – zwei Hände mit Ass sind weit stärker als Hard 12.` };
    case '8':
      return { action: 'split', reason: `Achten immer splitten – Hard 16 ist die schwächste Hand, 8 ist ein guter Start.` };
    case '10': case 'J': case 'Q': case 'K':
      return { action: 'stand', reason: `Zehner-Paar = Hard 20 – immer stehen, starke Hand.` };
    case '9':
      if ([7, 10, 11].includes(d))
        return { action: 'stand', reason: `Neuner stehen gegen Dealer-${d}. Deine 18 reicht hier aus.` };
      return { action: 'split', reason: `Neuner splitten gegen Dealer-${d}. Zwei Neun-Hände schlagen 18.` };
    case '7':
      if (d >= 2 && d <= 7)
        return { action: 'split', reason: `Siebener splitten gegen schwachen Dealer-${d}.` };
      return { action: 'hit', reason: `Siebener hiten gegen Dealer-${d} – kein Split bei starker Dealer-Karte.` };
    case '6':
      if (d >= 2 && d <= 6)
        return { action: 'split', reason: `Sechser splitten gegen schwachen Dealer-${d}.` };
      return { action: 'hit', reason: `Sechser hiten gegen Dealer-${d}.` };
    case '5':
      if (canDouble && d >= 2 && d <= 9)
        return { action: 'double', reason: `Fünfer-Paar = Hard 10 – Doppeln gegen Dealer-${d}.` };
      return { action: 'hit', reason: `Fünfer-Paar = Hard 10 – Hiten gegen Dealer-${d}.` };
    case '4':
      if (d === 5 || d === 6)
        return { action: 'split', reason: `Vierer splitten nur gegen Dealer 5 oder 6.` };
      return { action: 'hit', reason: `Vierer hiten gegen Dealer-${d}.` };
    case '3': case '2':
      if (d >= 2 && d <= 7)
        return { action: 'split', reason: `${rank}er splitten gegen schwachen Dealer-${d}.` };
      return { action: 'hit', reason: `${rank}er hiten gegen starken Dealer-${d}.` };
  }
  return null;
}

function softStrategy(hand, d, canDouble) {
  const total = getHandValue(hand);
  // Find the non-ace card value (for 2-card soft hands)
  const nonAce = hand.find(c => c.rank !== 'A');
  const v = nonAce ? Math.min(nonAce.value, 10) : total - 11;

  if (total >= 19) // A,8 or A,9
    return { action: 'stand', reason: `Soft ${total} – immer stehen. Diese Hand ist sehr stark.` };

  if (total === 18) { // A,7
    if (d >= 3 && d <= 6 && canDouble)
      return { action: 'double', reason: `Soft 18 – Doppeln gegen schwachen Dealer-${d}.` };
    if (d === 2 || d === 7 || d === 8)
      return { action: 'stand', reason: `Soft 18 – Stehen gegen Dealer-${d}.` };
    return { action: 'hit', reason: `Soft 18 – Hiten gegen starken Dealer-${d}.` };
  }

  if (total === 17) { // A,6
    if (d >= 3 && d <= 6 && canDouble)
      return { action: 'double', reason: `Soft 17 – Doppeln gegen Dealer-${d}.` };
    return { action: 'hit', reason: `Soft 17 – Hiten gegen Dealer-${d}.` };
  }

  if (total === 16 || total === 15) { // A,5 or A,4
    if (d >= 4 && d <= 6 && canDouble)
      return { action: 'double', reason: `Soft ${total} – Doppeln gegen schwachen Dealer-${d}.` };
    return { action: 'hit', reason: `Soft ${total} – Hiten gegen Dealer-${d}.` };
  }

  if (total === 14 || total === 13) { // A,3 or A,2
    if ((d === 5 || d === 6) && canDouble)
      return { action: 'double', reason: `Soft ${total} – Doppeln gegen sehr schwachen Dealer-${d}.` };
    return { action: 'hit', reason: `Soft ${total} – Hiten gegen Dealer-${d}.` };
  }

  return { action: 'hit', reason: `Soft ${total} – Hiten.` };
}

function hardStrategy(value, d, canDouble) {
  if (value >= 17)
    return { action: 'stand', reason: `Hard ${value} – immer stehen. Bustrisiko zu hoch.` };

  if (value >= 13 && value <= 16) {
    if (d >= 2 && d <= 6)
      return { action: 'stand', reason: `Hard ${value} gegen Dealer-${d} – Stehen, lass den Dealer busten.` };
    return { action: 'hit', reason: `Hard ${value} gegen Dealer-${d} – Hiten, Dealer hat starke Karte.` };
  }

  if (value === 12) {
    if (d >= 4 && d <= 6)
      return { action: 'stand', reason: `Hard 12 gegen Dealer-${d} – Stehen, Dealer hat Bustrisiko.` };
    return { action: 'hit', reason: `Hard 12 gegen Dealer-${d} – Hiten.` };
  }

  if (value === 11) {
    if (d !== 11 && canDouble)
      return { action: 'double', reason: `Hard 11 – Doppeln gegen Dealer-${d}. Starke Ausgangslage.` };
    return { action: 'hit', reason: `Hard 11 gegen Dealer-Ass – Hiten statt Doppeln.` };
  }

  if (value === 10) {
    if (d >= 2 && d <= 9 && canDouble)
      return { action: 'double', reason: `Hard 10 – Doppeln gegen Dealer-${d}. Gute Chance auf starke Karte.` };
    return { action: 'hit', reason: `Hard 10 gegen Dealer-${d} – Hiten.` };
  }

  if (value === 9) {
    if (d >= 3 && d <= 6 && canDouble)
      return { action: 'double', reason: `Hard 9 – Doppeln gegen schwachen Dealer-${d}.` };
    return { action: 'hit', reason: `Hard 9 – Hiten gegen Dealer-${d}.` };
  }

  return { action: 'hit', reason: `Hard ${value} – immer Hiten. Hand ist zu schwach.` };
}

// EV estimation stubs — implement with deck simulation for full accuracy
export function estimateHitEV(playerHand, dealerUpcard, shoe) {
  // TODO: For each card in shoe, compute resulting hand value and simulate dealer completion
  return null;
}

export function estimateStandEV(playerHand, dealerUpcard, shoe) {
  // TODO: Simulate all dealer draw sequences from shoe and compare to player value
  return null;
}

export function estimateDoubleEV(playerHand, dealerUpcard, shoe) {
  // TODO: Like hit EV but with doubled stake and forced stand after one card
  return null;
}

export function estimateSplitEV(playerHand, dealerUpcard, shoe) {
  // TODO: Simulate two independent hands each starting with one split card
  return null;
}

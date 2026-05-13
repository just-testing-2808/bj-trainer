// deck.js – Card, Shoe and Hand utilities

export const SUITS = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_SYMBOLS = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠'
};

let _cardIdCounter = 0;

export function createCard(rank, suit) {
  let value;
  if (rank === 'A') value = 11;
  else if (['J', 'Q', 'K'].includes(rank)) value = 10;
  else value = parseInt(rank, 10);
  return { rank, suit, value, id: `${rank}${suit[0].toUpperCase()}_${++_cardIdCounter}` };
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(createCard(rank, suit));
    }
  }
  return deck;
}

export function createShoe(numDecks = 6) {
  let shoe = [];
  for (let i = 0; i < numDecks; i++) shoe = shoe.concat(createDeck());
  return shuffle(shoe);
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function dealCard(shoe) {
  return shoe.length > 0 ? shoe.pop() : null;
}

export function getHandValue(hand) {
  let total = 0;
  let aces = 0;
  for (const card of hand) {
    if (card.rank === 'A') { aces++; total += 11; }
    else total += card.value;
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

export function isSoftHand(hand) {
  let total = 0;
  let softAces = 0;
  for (const card of hand) {
    if (card.rank === 'A') { softAces++; total += 11; }
    else total += card.value;
  }
  while (total > 21 && softAces > 0) { total -= 10; softAces--; }
  return softAces > 0;
}

export function isBlackjack(hand) {
  return hand.length === 2 && getHandValue(hand) === 21;
}

export function isBust(hand) {
  return getHandValue(hand) > 21;
}

export function isPair(hand) {
  return hand.length === 2 && hand[0].rank === hand[1].rank;
}

export function getHandDescription(hand) {
  if (!hand || hand.length === 0) return '';
  if (isBlackjack(hand)) return 'BJ!';
  if (isBust(hand)) return 'BUST';
  const val = getHandValue(hand);
  if (isSoftHand(hand)) return `Soft ${val}`;
  return `${val}`;
}

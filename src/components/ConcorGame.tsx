import { useState, useEffect, DragEvent, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';

// --- Interfaces ---
interface Player {
  id: number;
  name: string;
  cards: string[];
  slot: 'bottom' | 'top' | 'left' | 'right';
  position: {
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    transform?: string;
  };
}

interface DiscardedCard {
  playerId: number;
  card: string;
}

// --- Card Utilities ---
interface ParsedCard {
  original: string;
  rank: string;
  suit: string;
  value: number;
  color: 'red' | 'black';
}

const CARD_VALUES: { [key: string]: number } = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};
const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

function getCardColor(suit: string): 'red' | 'black' {
  if (suit === '♥' || suit === '♦') {
    return 'red';
  }
  return 'black';
}

function parseCard(cardStr: string): ParsedCard {
  const suit = cardStr.slice(-1);
  const rank = cardStr.length === 3 ? '10' : cardStr.slice(0, -1); // Handles '10'
  return {
    original: cardStr,
    rank,
    suit,
    value: CARD_VALUES[rank],
    color: getCardColor(suit),
  };
}

// --- Meld Validation Utilities ---
function isSet(cards: ParsedCard[]): boolean {
  if (cards.length < 3 || cards.length > 4) return false;

  const firstRank = cards[0].rank;
  if (!cards.every(card => card.rank === firstRank)) return false;

  const redCount = cards.filter(card => card.color === 'red').length;
  const blackCount = cards.filter(card => card.color === 'black').length;

  if (cards.length === 3) {
    // One card must have a different color from the other two
    // (2 Red, 1 Black) OR (1 Red, 2 Black)
    return (redCount === 2 && blackCount === 1) || (redCount === 1 && blackCount === 2);
  } else if (cards.length === 4) {
    // Must have 2 red and 2 black colors
    return redCount === 2 && blackCount === 2;
  }
  return false;
}

function isRun(cards: ParsedCard[]): boolean {
  if (cards.length < 3) return false; // Runs must be at least 3
  const firstSuit = cards[0].suit;
  if (!cards.every(card => card.suit === firstSuit)) return false; // All cards must have the same suit

  const sortedCards = [...cards].sort((a, b) => a.value - b.value);

  // Check for standard sequence (e.g., 2-3-4, 10-J-Q)
  let standardSequence = true;
  for (let i = 1; i < sortedCards.length; i++) {
    if (sortedCards[i].value !== sortedCards[i - 1].value + 1) {
      standardSequence = false;
      break;
    }
  }
  if (standardSequence) return true;

  // Check for Ace-high sequence (e.g., Q-K-A or J-Q-K-A)
  const hasAce = sortedCards.some(c => c.rank === 'A');
  if (hasAce) {
    // Check if other cards form the top of a sequence (e.g. for QKA, Q and K are present; for JQKA, J, Q, K are present)
    const nonAceRanks = sortedCards.filter(c => c.rank !== 'A').map(c => c.rank);
    if (nonAceRanks.length === sortedCards.length - 1) { // Make sure there's only one Ace
        const expectedHighRanks = RANK_ORDER.slice(-(sortedCards.length -1)); // e.g., ['Q', 'K'] for a 3-card run with Ace
        
        // Check if nonAceRanks match expectedHighRanks
        if (nonAceRanks.length === expectedHighRanks.length && nonAceRanks.every((rank, idx) => rank === expectedHighRanks[idx])) {
            return true;
        }
    }
  }
  return false;
}


// --- Combination Utility ---
function getCombinations<T>(array: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(startIndex: number, currentCombination: T[]) {
    if (currentCombination.length === k) {
      result.push([...currentCombination]);
      return;
    }
    if (startIndex === array.length) {
      return;
    }
    // Include array[startIndex]
    currentCombination.push(array[startIndex]);
    backtrack(startIndex + 1, currentCombination);
    currentCombination.pop();

    // Exclude array[startIndex]
    // To avoid duplicate combinations when source array has duplicates,
    // we only proceed if the element is different from the previous one OR
    // if we are including the current element.
    // However, for card hands, cards are unique (e.g. '7H' is distinct from another '7H' if it was from a second deck,
    // but here we assume a list of unique card strings).
    // The current `getCombinations` creates combinations of *indices* effectively,
    // so if the input `array` has distinct items, output combinations will be of distinct items.
    backtrack(startIndex + 1, currentCombination);
  }
  backtrack(0, []);
  return result;
}

// --- Styled Components ---

const GameContainer = styled.div`
  max-width: 100%;
  margin: 0 auto;
  padding: 1rem 1rem 2rem 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  background-color: #0f172a;
  color: #e2e8f0;
  min-height: 100vh;
  overflow-x: hidden;
`;

const TableWrapper = styled.div`
  position: relative;
  width: 1000px;
  max-width: 90%;
  height: 450px;
  margin: 0.5rem auto 0 auto;
  background: #1a1a2e;
  border-radius: 120px 120px 0 0;
  padding: 20px;
  box-shadow: 0 0 70px rgba(0, 0, 0, 0.3), inset 0 0 40px rgba(0, 0, 0, 0.3);
  flex-shrink: 0;
`;

const Table = styled.div`
  background: #17794c;
  width: 100%;
  height: 100%;
  position: relative;
  border: 30px solid #603813;
  border-radius: 100px 100px 0 0;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.4), inset 0 0 10px rgba(0, 0, 0, 0.5);

  &::before {
    content: ''; position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px;
    border: 10px solid #4a2c0f; border-radius: 120px 120px 0 0; z-index: -1;
  }
  &::after {
    content: ''; position: absolute; top: -10px; left: -10px; right: -10px; bottom: -10px;
    border: 6px solid #78441b; border-radius: 110px 110px 0 0; z-index: -1;
  }
`;

const CARD_ASPECT_RATIO = 3.5 / 2.5;
const HAND_CARD_WIDTH = 60;
const HAND_CARD_FONT_SIZE = 12;
const HAND_CARD_GAP = 5;

const Card = styled.div<{
  suit?: string;
  isDragging?: boolean;
  nonInteractive?: boolean;
  cardWidth?: number;
  cardFontSize?: number;
  isWinnerCard?: boolean; // For styling winning cards
}>`
  background: #ffffff;
  border-radius: ${props => Math.max(4, (props.cardWidth || HAND_CARD_WIDTH) * 0.075)}px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: bold;
  color: ${props => (props.suit === '♥' || props.suit === '♦') ? '#e94560' : '#1e293b'};
  box-shadow: 0 1px 2px rgba(0,0,0,0.15), 0 0 3px rgba(255,255,255,0.05);
  cursor: ${props => props.nonInteractive ? 'default' : (props.isDragging ? 'grabbing' : 'grab')};
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.1);
  opacity: ${props => props.isDragging ? 0.5 : 1};
  user-select: none;
  flex-shrink: 0;
  border-color: ${props => props.isWinnerCard ? '#f0a500' : 'rgba(0,0,0,0.1)'};
  box-shadow: ${props => props.isWinnerCard ? '0 0 10px #f0a500' : '0 1px 2px rgba(0,0,0,0.15), 0 0 3px rgba(255,255,255,0.05)'};


  width: ${props => props.cardWidth || HAND_CARD_WIDTH}px;
  height: ${props => (props.cardWidth || HAND_CARD_WIDTH) * CARD_ASPECT_RATIO}px;
  font-size: ${props => props.cardFontSize || HAND_CARD_FONT_SIZE}px;

  span {
    white-space: nowrap;
    display: inline-block;
  }

  &::before {
    content: '';
    position: absolute;
    top: ${props => Math.max(2, (props.cardWidth || HAND_CARD_WIDTH) * 0.04)}px;
    left: ${props => Math.max(2, (props.cardWidth || HAND_CARD_WIDTH) * 0.04)}px;
    right: ${props => Math.max(2, (props.cardWidth || HAND_CARD_WIDTH) * 0.04)}px;
    bottom: ${props => Math.max(2, (props.cardWidth || HAND_CARD_WIDTH) * 0.04)}px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: ${props => Math.max(3, (props.cardWidth || HAND_CARD_WIDTH) * 0.05)}px;
  }
  &:hover {
    transform: ${props => props.nonInteractive ? 'none' : `translateY(-${(props.cardWidth || HAND_CARD_WIDTH) * 0.08}px)`};
    box-shadow: ${props => props.nonInteractive || props.isWinnerCard
      ? (props.isWinnerCard ? '0 0 10px #f0a500' : '0 1px 2px rgba(0,0,0,0.15), 0 0 3px rgba(255,255,255,0.05)')
      : `0 ${ (props.cardWidth || HAND_CARD_WIDTH) * 0.05}px ${ (props.cardWidth || HAND_CARD_WIDTH) * 0.15}px rgba(0,0,0,0.3), 0 0 ${ (props.cardWidth || HAND_CARD_WIDTH) * 0.1}px rgba(255,255,255,0.2)`};
  }
`;

const PlayerHand = styled.div`
  display: flex;
  flex-wrap: nowrap;
  overflow: hidden;
  gap: ${HAND_CARD_GAP}px;
  padding: 0.5rem;
  justify-content: center;
  align-items: center;
  width: 100%;
  min-height: ${HAND_CARD_WIDTH * CARD_ASPECT_RATIO}px;
`;

const Button = styled.button`
  background: #e94560;
  color: #ffffff;
  border: none;
  padding: 0.7rem 1.2rem;
  font-size: 0.9rem;
  border-radius: 5px;
  cursor: pointer;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  width: auto; /* MODIFIED: Allow button to size to content or be controlled by parent */
  min-width: 120px; /* MODIFIED: Give a minimum width */

  &:hover:not(:disabled) { background: #d13551; transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.3); }
  &:active:not(:disabled) { transform: translateY(0); box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
  &:disabled { background: #6b7280; color: #d1d5db; cursor: not-allowed; transform: none; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
`;

const PlayerInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  color: #f1f5f9;

  &.on-table { margin-bottom: 0.5rem; font-size: 0.9rem; }
  &.current-player-title { padding: 0 0.5rem; margin-bottom: 0.25rem; }

  h3 { color: #e94560; font-size: 1.1rem; text-shadow: 0 0 8px rgba(233,69,96,0.3); margin: 0; white-space: nowrap; }
  span { font-size: 0.85rem; color: #cbd5e1; }
`;

const PlayerCount = styled.div`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  min-width: 26px; height: 26px;
  font-size: 0.8rem;
  background: #e94560; border-radius: 50%;
  display: flex; justify-content: center; align-items: center;
  color: white; font-weight: bold;
  box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 0 6px rgba(233,69,96,0.3);
  border: 1px solid rgba(255,255,255,0.1);
  z-index: 5;
`;

const PlayerSection = styled.div<{ position: Player['position'] }>`
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(5px);
  border-radius: 10px;
  padding: 0.75rem;
  position: absolute;
  width: 160px;
  min-height: 60px;
  border: 1.5px solid #e94560;
  box-shadow: 0 0 8px rgba(233, 69, 96, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  ${({ position }) => ({ ...position })}
`;

const MAX_CARDS_IN_HAND_DISPLAY = 14;

const CurrentPlayerArea = styled.div`
  background: rgba(22, 33, 62, 0.95);
  border-radius: 10px;
  padding: 0.25rem 0.5rem;
  width: 100%;
  max-width: calc(${MAX_CARDS_IN_HAND_DISPLAY * HAND_CARD_WIDTH + (MAX_CARDS_IN_HAND_DISPLAY -1) * HAND_CARD_GAP + 20}px);
  margin: 0.25rem auto 0 auto;
  border: 1.5px solid #f0a500;
  box-shadow: 0 0 15px rgba(240, 165, 0, 0.3);
  color: #f1f5f9;
  flex-shrink: 0;
`;

const DiscardPile = styled.div`
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  bottom: 30%;
  min-height: 110px;
  max-width: 200px;
  padding: 0.5rem;
  gap: 0.25rem;
  background: rgba(0,0,0,0.3);
  border-radius: 10px;
  border: 1.5px solid rgba(233,69,96,0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;
const DiscardInfo = styled.div`
  font-size: 0.9rem;
  text-align: center; color: #f1f5f9; text-shadow: 0 0 8px rgba(255,255,255,0.3);
`;
const DeckPile = styled.div`
  position: absolute; bottom: 35%; right: 25%; transform: translate(50%, 50%);
  width: 60px; height: ${60 * CARD_ASPECT_RATIO}px;
  font-size: 0.9rem;
  background: linear-gradient(145deg, #16213e, #1a1a2e); border-radius: 5px;
  display: flex; justify-content: center; align-items: center;
  color: #f1f5f9; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.2), 0 0 10px rgba(0,0,0,0.3);
  border: 1px solid rgba(233,69,96,0.3); transition: all 0.3s ease; font-weight: bold;
  &:hover { transform: translate(50%, 45%); }
  &::after {
    font-size: 0.7rem; bottom: -18px;
    content: 'DECK'; position: absolute; color: rgba(255,255,255,0.7); font-weight: normal;
  }
`;
const DiscardPlaceholder = styled.div`
  width: 60px; height: ${60 * CARD_ASPECT_RATIO}px;
  font-size: 0.8rem;
  color: rgba(255,255,255,0.7); text-align: center;
  display: flex; justify-content: center; align-items: center;
  border: 1.5px dashed rgba(255,255,255,0.2); border-radius: 5px;
`;

const GlobalControls = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: center;
  align-items: center; /* Align items vertically */
  margin-bottom: 0.5rem;
  flex-shrink: 0;
  flex-wrap: wrap; /* Allow buttons to wrap if not enough space */
`;

const FixedSideControls = styled.div`
  position: fixed;
  right: 15px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(22, 33, 62, 0.85);
  backdrop-filter: blur(5px);
  border-radius: 8px;
  border: 1px solid rgba(240, 165, 0, 0.5);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  min-width: 130px;
`;

// --- Helper Functions & Game Logic ---
const MIN_CARDS_PER_PLAYER = 13; // Define globally for checkWinningCondition

// Core Winning Condition Logic
function checkWinningCondition(handStrings: string[]): boolean {
  if (handStrings.length !== MIN_CARDS_PER_PLAYER) return false;

  const hand = handStrings.map(parseCard);

  const allPossibleMelds = (cards: ParsedCard[], size: number): ParsedCard[][] => {
    const melds: ParsedCard[][] = [];
    if (cards.length < size) return [];
    const combos = getCombinations(cards, size);
    for (const combo of combos) {
      if (isSet(combo) || isRun(combo)) {
        melds.push(combo);
      }
    }
    return melds;
  };

  const meldsOf4 = allPossibleMelds(hand, 4);

  for (const meld4 of meldsOf4) {
    const meld4Originals = new Set(meld4.map(c => c.original));
    const remainingCardsAfterMeld4 = hand.filter(
      card => !meld4Originals.has(card.original)
    );

    if (remainingCardsAfterMeld4.length !== MIN_CARDS_PER_PLAYER - 4) continue;

    const meldsOf3FromRemaining = allPossibleMelds(remainingCardsAfterMeld4, 3);
    if (meldsOf3FromRemaining.length < 2) continue;

    const combosOfTwoMeld3 = getCombinations(meldsOf3FromRemaining, 2);

    for (const [m3_one, m3_two] of combosOfTwoMeld3) {
      const m3_one_originals = new Set(m3_one.map(c => c.original));
      let areDisjoint = true;
      for (const cardInM3Two of m3_two) {
        if (m3_one_originals.has(cardInM3Two.original)) {
          areDisjoint = false;
          break;
        }
      }
      if (areDisjoint) {
        return true;
      }
    }
  }
  return false;
}


const getPlayerPositions = (numPlayers: number): Player[] => {
  const positions: Player[] = [];
  const basePlayer = { id: 0, name: '', cards: [], slot: 'bottom' as Player['slot'], position: {} };
  for (let i = 0; i < numPlayers; i++) {
    const player = { ...basePlayer, id: i + 1, name: `Player ${i + 1}` };
    switch (i) {
      case 0: player.slot = 'bottom'; player.position = { bottom: '15px', left: '50%', transform: 'translateX(-50%)' }; break;
      case 1: player.slot = 'right'; player.position = { right: '15px', top: '50%', transform: 'translateY(-50%)' }; break;
      case 2: player.slot = 'top'; player.position = { top: '15px', left: '50%', transform: 'translateX(-50%)' }; break;
      case 3: player.slot = 'left'; player.position = { left: '15px', top: '50%', transform: 'translateY(-50%)' }; break;
    }
    positions.push(player);
  }
  return positions;
};

const ConcorGame = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [discardedCards, setDiscardedCards] = useState<DiscardedCard[]>([]);
  const [deck, setDeck] = useState<string[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState(0);
  const [draggedCardIndex, setDraggedCardIndex] = useState<number | null>(null);
  const [winner, setWinner] = useState<Player | null>(null);
  const [canDeclare, setCanDeclare] = useState(false);

  const MAX_CARDS_PER_PLAYER_LOGIC = 14;

  const playersRef = useRef(players);
  const currentPlayerRef = useRef(currentPlayer);

  useEffect(() => {
    playersRef.current = players;
    const player = players[currentPlayerRef.current];
    if (player && player.cards.length === MIN_CARDS_PER_PLAYER && !winner) {
        setCanDeclare(checkWinningCondition(player.cards));
    } else {
        setCanDeclare(false);
    }
  }, [players, winner]);

  useEffect(() => {
    currentPlayerRef.current = currentPlayer;
    const player = playersRef.current[currentPlayer];
     if (player && player.cards.length === MIN_CARDS_PER_PLAYER && !winner) {
        setCanDeclare(checkWinningCondition(player.cards));
    } else {
        setCanDeclare(false);
    }
  }, [currentPlayer, winner]);


  const createDeck = (numberOfPlayersForThisGame: number) => {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    let newDeck: string[] = [];
    const numDecks = Math.max(1, Math.ceil(numberOfPlayersForThisGame / 2)); // Use 2 decks for 3-4 players, 1 for 1-2
    for (let d = 0; d < numDecks; d++) {
      for (const suit of suits) {
        for (const value of values) { newDeck.push(value + suit); }
      }
    }
    for (let i = newDeck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
  };

  const startGame = () => {
    const numPlayers = 4; // Or make this configurable
    const newPlayers = getPlayerPositions(numPlayers);
    const newDeck = createDeck(numPlayers);
    const cardsToDeal = MIN_CARDS_PER_PLAYER;
    newPlayers.forEach(player => {
      player.cards = newDeck.splice(0, Math.min(cardsToDeal, newDeck.length));
    });
    setPlayers(newPlayers);
    setDeck(newDeck);
    setDiscardedCards([]);
    setCurrentPlayer(0);
    setWinner(null);
    setCanDeclare(false);

    const firstPlayer = newPlayers[0];
    if (firstPlayer && firstPlayer.cards.length === MIN_CARDS_PER_PLAYER) {
        if (checkWinningCondition(firstPlayer.cards)) {
            setCanDeclare(true);
        }
    }
  };

  const drawCard = () => {
    if (winner) return;
    const currentPlayersArray = playersRef.current;
    const currentPlayerIdx = currentPlayerRef.current;
    const currentPlayerData = currentPlayersArray[currentPlayerIdx];

    if (deck.length === 0) { alert("Deck is empty!"); return; }
    if (!currentPlayerData) return;
    if (currentPlayerData.cards.length >= MAX_CARDS_PER_PLAYER_LOGIC) {
      alert(`You cannot have more than ${MAX_CARDS_PER_PLAYER_LOGIC} cards.`); return;
    }
    const newCard = deck[0];
    const updatedPlayers = currentPlayersArray.map((player, index) =>
      index === currentPlayerIdx ? { ...player, cards: [...player.cards, newCard] } : player
    );
    setDeck(prevDeck => prevDeck.slice(1));
    setPlayers(updatedPlayers);
    // setCanDeclare(false); // This is handled by useEffect on players
  };

  const discardCard = (cardIndexToDiscard: number) => {
    if (winner) return;
    if (draggedCardIndex !== null) return;

    const currentPlayersArray = playersRef.current;
    const currentPlayerIdx = currentPlayerRef.current;
    const currentPlayerData = currentPlayersArray[currentPlayerIdx];

    if (!currentPlayerData || !currentPlayerData.cards[cardIndexToDiscard]) return;

    if (currentPlayerData.cards.length <= MIN_CARDS_PER_PLAYER) {
      alert(`Cannot discard. You have ${currentPlayerData.cards.length} cards (must be > ${MIN_CARDS_PER_PLAYER} to discard).\nIf you have ${MIN_CARDS_PER_PLAYER} cards, you can 'Skip', 'Declare Win', or 'Draw' first (then you must discard).`);
      return;
    }

    const discardedItem = currentPlayerData.cards[cardIndexToDiscard];
    const updatedPlayerList = currentPlayersArray.map((p, index) =>
      index === currentPlayerIdx ? { ...p, cards: p.cards.filter((_, i) => i !== cardIndexToDiscard) } : p
    );
    
    const playerAfterDiscard = updatedPlayerList[currentPlayerIdx];
    let advanceTurn = true;

    if (playerAfterDiscard && playerAfterDiscard.cards.length === MIN_CARDS_PER_PLAYER) {
      if (checkWinningCondition(playerAfterDiscard.cards)) {
        advanceTurn = false; // Player can declare, don't advance turn yet
      }
    } else if (playerAfterDiscard && playerAfterDiscard.cards.length > MIN_CARDS_PER_PLAYER) {
      alert(`You now have ${playerAfterDiscard.cards.length} cards. You must continue to discard until you have exactly ${MIN_CARDS_PER_PLAYER} cards to end your turn.`);
      advanceTurn = false;
    }
    
    setPlayers(updatedPlayerList); // Update players state, useEffect will handle canDeclare
    setDiscardedCards(prev => [...prev, { playerId: currentPlayerData.id, card: discardedItem }]);

    if (advanceTurn && playerAfterDiscard && playerAfterDiscard.cards.length === MIN_CARDS_PER_PLAYER) {
        setCurrentPlayer(prev => (prev + 1) % updatedPlayerList.length);
    }
  };

  const skipTurn = useCallback(() => {
    if (winner) return;
    const latestPlayersArray = playersRef.current;
    const latestPlayerIdx = currentPlayerRef.current;
    const playerState = latestPlayersArray[latestPlayerIdx];

    if (!playerState) { return; }
    
    if (playerState.cards.length === MIN_CARDS_PER_PLAYER) {
      if (checkWinningCondition(playerState.cards)) {
        alert("You have a winning hand! You should 'Declare Win' instead of skipping.");
        return;
      }
      setCurrentPlayer(prevPlayerIdx => (prevPlayerIdx + 1) % latestPlayersArray.length);
    } else {
      alert(`Cannot skip. You must have exactly ${MIN_CARDS_PER_PLAYER} cards to skip your turn.\nYou currently have ${playerState.cards.length} cards.`);
    }
  }, [setCurrentPlayer, winner]);

  const declareWin = () => {
    if (winner) return;
    const player = players[currentPlayer]; // Use current state for this action
    if (player && player.cards.length === MIN_CARDS_PER_PLAYER && checkWinningCondition(player.cards)) {
      setWinner(player);
      alert(`${player.name} wins the game!`);
    } else {
      alert("Cannot declare win. Conditions not met or hand is not 13 cards.");
      setCanDeclare(false);
    }
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    if (winner) return;
    e.dataTransfer.setData('draggedCardIndex', index.toString());
    e.dataTransfer.effectAllowed = "move";
    setDraggedCardIndex(index);
  };
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (winner) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const handleDrop = (e: DragEvent<HTMLDivElement>, dropTargetIndex: number) => {
    if (winner) return;
    e.preventDefault();
    if (draggedCardIndex === null) return;
    
    const cardBeingDraggedIndex = parseInt(e.dataTransfer.getData('draggedCardIndex'), 10);
    const originalDraggedIndex = draggedCardIndex;
    setDraggedCardIndex(null);

    if (cardBeingDraggedIndex === dropTargetIndex && e.currentTarget === e.target) {
        return;
    }

    const currentPlayersArray = playersRef.current;
    const currentPlayerIdx = currentPlayerRef.current;
    const currentPlayerData = currentPlayersArray[currentPlayerIdx];
    if (!currentPlayerData) return;

    const currentPlayerCards = [...currentPlayerData.cards];
    if (originalDraggedIndex >= currentPlayerCards.length) return;

    const draggedItem = currentPlayerCards.splice(cardBeingDraggedIndex, 1)[0];
    
    let actualDropTargetIndex = dropTargetIndex;
    if (cardBeingDraggedIndex < dropTargetIndex) {
        actualDropTargetIndex--;
    }
        
    if (e.currentTarget.classList.contains(PlayerHand.styledComponentId) && dropTargetIndex >= currentPlayerData.cards.length) {
         actualDropTargetIndex = currentPlayerCards.length;
    }

    currentPlayerCards.splice(actualDropTargetIndex, 0, draggedItem);
    
    const updatedPlayers = currentPlayersArray.map((p, index) =>
      index === currentPlayerIdx ? { ...p, cards: currentPlayerCards } : p
    );
    setPlayers(updatedPlayers);
  };
  const handleDragEnd = () => {
    if (winner) return;
    setDraggedCardIndex(null);
  };

  useEffect(() => { startGame(); }, []);

  const lastDiscarded = discardedCards.length > 0 ? discardedCards[discardedCards.length - 1] : null;
  const currentPlayerDataForRender = players[currentPlayer];
  const canDraw = !winner && currentPlayerDataForRender && deck.length > 0 && currentPlayerDataForRender.cards.length < MAX_CARDS_PER_PLAYER_LOGIC;
  // canSkip condition in skipTurn function now also checks if it's a winning hand.
  // The button's disabled state can be simpler:
  const canSkipButton = !winner && currentPlayerDataForRender && currentPlayerDataForRender.cards.length === MIN_CARDS_PER_PLAYER;


  return (
    <GameContainer>
      <GlobalControls>
        <Button onClick={startGame}>New Game</Button>
        {currentPlayerDataForRender && !winner && (
            <Button 
              onClick={declareWin} 
              disabled={!canDeclare || !!winner || currentPlayerDataForRender.cards.length !== MIN_CARDS_PER_PLAYER}
              title={
                currentPlayerDataForRender.cards.length !== MIN_CARDS_PER_PLAYER ? "Must have 13 cards to declare" : 
                !canDeclare ? "Hand does not meet winning conditions" : "Declare your winning hand!"
              }
            >
                Declare Win
            </Button>
        )}
      </GlobalControls>

      {winner && (
        <div style={{ 
            color: '#f0a500', 
            fontSize: '1.5rem', 
            textAlign: 'center', 
            margin: '1rem 0', 
            padding: '1rem', 
            background: 'rgba(0,0,0,0.7)', 
            borderRadius: '8px',
            border: '2px solid #f0a500',
            boxShadow: '0 0 15px #f0a500'
            }}>
          🎉 {winner.name} has won the game! 🎉
        </div>
      )}

      <TableWrapper>
        <Table>
          <DiscardPile>
            <DiscardInfo>Discard</DiscardInfo>
            {lastDiscarded ? (
              <Card
                suit={lastDiscarded.card.slice(-1)}
                cardWidth={60}
                cardFontSize={10}
                nonInteractive
              >
                <span>{lastDiscarded.card}</span>
              </Card>
            ) : ( <DiscardPlaceholder>Empty</DiscardPlaceholder> )}
          </DiscardPile>

          <DeckPile onClick={() => {
            if (winner) return;
            if (currentPlayerDataForRender && canDraw) drawCard();
            else if (currentPlayerDataForRender && currentPlayerDataForRender.cards.length >= MAX_CARDS_PER_PLAYER_LOGIC) alert(`Max ${MAX_CARDS_PER_PLAYER_LOGIC} cards. You must discard.`);
            else if (deck.length === 0) alert("Deck is empty!");
          }}>
            {deck.length > 0 ? deck.length : '0'}
          </DeckPile>

          {players.map((player, playerIndex) => {
            const isCurrent = currentPlayer === playerIndex;
            const isWinnerPlayer = winner && winner.id === player.id;
            return (
              <PlayerSection
                key={player.id}
                position={player.position}
                style={isWinnerPlayer ? { borderColor: '#f0a500', boxShadow: '0 0 15px #f0a500'} : {}}
              >
                <PlayerInfo className="on-table">
                  <h3>{player.name} {isCurrent && !winner && <span style={{fontSize: '0.7em'}}> (Turn)</span>}</h3>
                </PlayerInfo>
                <PlayerCount style={isWinnerPlayer ? { backgroundColor: '#f0a500'} : {}}>{player.cards.length}</PlayerCount>
              </PlayerSection>
            );
          })}
        </Table>
      </TableWrapper>

      {currentPlayerDataForRender && (
        <FixedSideControls>
            <Button onClick={drawCard} disabled={!canDraw || !!winner}>Draw</Button>
            <Button onClick={skipTurn} disabled={!canSkipButton || !!winner}>Skip</Button>
        </FixedSideControls>
      )}

      {currentPlayerDataForRender && (
        <CurrentPlayerArea style={winner && winner.id === currentPlayerDataForRender.id ? { borderColor: '#f0a500', boxShadow: '0 0 20px #f0a500'} : {}}>
            <PlayerInfo className="current-player-title">
                <h3>Your Hand ({currentPlayerDataForRender.name})</h3>
                <span>{currentPlayerDataForRender.cards.length} Cards</span>
            </PlayerInfo>
            <PlayerHand
                className={PlayerHand.styledComponentId}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, currentPlayerDataForRender.cards.length)}
            >
                {currentPlayerDataForRender.cards.map((card, cardIdx) => (
                    <Card
                        key={`${currentPlayerDataForRender.id}-${card}-${cardIdx}`}
                        suit={card.slice(-1)}
                        draggable={!winner}
                        onDragStart={(e) => handleDragStart(e, cardIdx)}
                        onDrop={(e) => { e.stopPropagation(); handleDrop(e, cardIdx);}}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onClickCapture={() => { if (draggedCardIndex === null && !winner) discardCard(cardIdx);}}
                        isDragging={draggedCardIndex === cardIdx}
                        nonInteractive={!!winner}
                        isWinnerCard={!!winner && winner.id === currentPlayerDataForRender.id}
                    >
                        <span>{card}</span>
                    </Card>
                ))}
                {Array.from({ length: Math.max(0, MAX_CARDS_IN_HAND_DISPLAY - currentPlayerDataForRender.cards.length) }).map((_, idx) => (
                    <Card
                        key={`placeholder-${idx}`}
                        cardWidth={HAND_CARD_WIDTH * 0.9}
                        cardFontSize={HAND_CARD_FONT_SIZE * 0.9}
                        nonInteractive
                        style={{
                            opacity: 0.15,
                            borderStyle: 'dashed',
                            borderColor: 'rgba(255,255,255,0.3)',
                            backgroundColor: 'rgba(255,255,255,0.02)'
                        }}
                    >
                        <span></span>
                    </Card>
                ))}
            </PlayerHand>
            {currentPlayerDataForRender.cards.length === 0 && MAX_CARDS_IN_HAND_DISPLAY === 0 &&
                 <div style={{textAlign: 'center', padding: '1rem', color: '#a0aec0'}}>Hand is empty.</div>
            }
             <div style={{ fontSize: '0.8rem', textAlign: 'center', padding: '0.25rem', color: '#cbd5e1', minHeight: '1.2em' }}>
                {!winner && currentPlayerDataForRender.cards.length === MIN_CARDS_PER_PLAYER && `You have ${MIN_CARDS_PER_PLAYER} cards. You can 'Skip', 'Declare Win', or 'Draw'.`}
                {!winner && currentPlayerDataForRender.cards.length > MIN_CARDS_PER_PLAYER && `You have ${currentPlayerDataForRender.cards.length} cards. You must 'Discard' to reach ${MIN_CARDS_PER_PLAYER} cards.`}
                {!winner && currentPlayerDataForRender.cards.length < MIN_CARDS_PER_PLAYER && deck.length > 0 && `You have ${currentPlayerDataForRender.cards.length} cards. You must 'Draw'.`}
                {!winner && currentPlayerDataForRender.cards.length < MIN_CARDS_PER_PLAYER && deck.length === 0 && `You have ${currentPlayerDataForRender.cards.length} cards. No cards left to draw.`}
            </div>
        </CurrentPlayerArea>
      )}
    </GameContainer>
  );
};

export default ConcorGame;
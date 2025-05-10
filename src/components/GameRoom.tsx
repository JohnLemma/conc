import { useState } from 'react';
import styled from 'styled-components';

const GameContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
`;

const Table = styled.div`
  background: #0f3460;
  border-radius: 50px;
  padding: 2rem;
  margin: 2rem 0;
  min-height: 400px;
  position: relative;
`;

const PlayerHand = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
`;

const Card = styled.div<{ suit?: string }>`
  width: 100px;
  height: 140px;
  background: #ffffff;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  color: ${props => (props.suit === '♥' || props.suit === '♦') ? '#e94560' : '#000000'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-10px);
  }
`;

const Controls = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
`;

const Button = styled.button`
  background: #e94560;
  color: #ffffff;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;

  &:hover {
    background: #d13551;
  }
`;

const GameRoom = () => {
  const [cards, setCards] = useState(['A♠', 'K♥', 'Q♦', 'J♣', '10♠']);

  const drawCard = () => {
    const suits = ['♠', '♥', '♦', '♣'];
    const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomValue = values[Math.floor(Math.random() * values.length)];
    setCards([...cards, randomValue + randomSuit]);
  };

  const shuffleCards = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
  };

  return (
    <GameContainer>
      <h2>Game Room</h2>
      <Table>
        <PlayerHand>
          {cards.map((card, index) => (
            <Card key={index} suit={card.slice(-1)}>
              {card}
            </Card>
          ))}
        </PlayerHand>
      </Table>
      <Controls>
        <Button onClick={drawCard}>Draw Card</Button>
        <Button onClick={shuffleCards}>Shuffle</Button>
      </Controls>
    </GameContainer>
  );
};

export default GameRoom;
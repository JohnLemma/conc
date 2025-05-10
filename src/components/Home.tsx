import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const HomeContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  color: #e94560;
  font-size: 3rem;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  color: #ffffff;
  font-size: 1.2rem;
  margin-bottom: 2rem;
`;

const Button = styled.button`
  background: #e94560;
  color: #ffffff;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.2rem;
  border-radius: 5px;
  cursor: pointer;
  transition: background 0.3s ease;

  &:hover {
    background: #d13551;
  }
`;

const GamesList = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin-top: 3rem;
`;

const GameCard = styled.div`
  background: #16213e;
  padding: 2rem;
  border-radius: 10px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.3s ease;

  &:hover {
    transform: translateY(-5px);
  }

  h3 {
    color: #e94560;
    margin-bottom: 1rem;
  }

  p {
    color: #ffffff;
    opacity: 0.8;
  }
`;

const Home = () => {
  const navigate = useNavigate();

  return (
    <HomeContainer>
      <Title>Welcome to Card Games</Title>
      <Subtitle>Play your favorite card games online with friends</Subtitle>
      <Button onClick={() => navigate('/game')}>Start Playing</Button>

      <GamesList>
        <GameCard onClick={() => navigate('/concor')}>
          <h3>Concor</h3>
          <p>A multiplayer card game for 2-5 players</p>
        </GameCard>
        <GameCard>
          <h3>Poker</h3>
          <p>Coming Soon</p>
        </GameCard>
        <GameCard>
          <h3>Blackjack</h3>
          <p>Coming Soon</p>
        </GameCard>
      </GamesList>
    </HomeContainer>
  );
};

export default Home;
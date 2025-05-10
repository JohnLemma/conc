import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import styled from 'styled-components'
import Home from './components/Home'
import GameRoom from './components/GameRoom'
import ConcorGame from './components/ConcorGame'
import Navbar from './components/Navbar'

const AppContainer = styled.div`
  min-height: 100vh;
  background: #1a1a2e;
  color: #ffffff;
`

function App() {
  return (
    <Router>
      <AppContainer>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<GameRoom />} />
          <Route path="/concor" element={<ConcorGame />} />
        </Routes>
      </AppContainer>
    </Router>
  )
}

export default App
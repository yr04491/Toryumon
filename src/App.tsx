import { useState } from 'react'
import TitleScreen from './screens/TitleScreen'
import SelectScreen from './screens/SelectScreen'
import GameScreen from './screens/GameScreen'
import ResultScreen from './screens/ResultScreen'
import type { StageIndex } from './types/stage'

export type Screen = 'title' | 'select' | 'game' | 'result'

export type GameResult = {
  userScore: number
  yamadaScore: number
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [selectedStage, setSelectedStage] = useState<StageIndex | null>(null)
  const [gameResult, setGameResult] = useState<GameResult>({ userScore: 0, yamadaScore: 0 })

  const goToSelect = () => setScreen('select')

  const goToGame = (stage: StageIndex) => {
    setSelectedStage(stage)
    setScreen('game')
  }

  const goToResult = (result: GameResult) => {
    setGameResult(result)
    setScreen('result')
  }

  const goToTitle = () => setScreen('title')

  return (
    <>
      {screen === 'title' && <TitleScreen onStart={goToSelect} />}
      {screen === 'select' && <SelectScreen onSelect={goToGame} />}
      {screen === 'game' && selectedStage && (
        <GameScreen stage={selectedStage} onFinish={goToResult} />
      )}
      {screen === 'result' && (
        <ResultScreen result={gameResult} onRetry={goToSelect} onTitle={goToTitle} />
      )}
    </>
  )
}

import { useState } from 'react'
import TitleScreen from './screens/TitleScreen'
import SelectScreen from './screens/SelectScreen'
import GameScreen from './screens/GameScreen'
import ResultScreen from './screens/ResultScreen'
import { saveRank } from './game/rankStorage'
import type { StageIndex, Rank } from './types/stage'

export type Screen = 'title' | 'select' | 'game' | 'result'

export type StageResult = {
  rank: Rank
  tooManyTaps: boolean
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('title')
  const [selectedStage, setSelectedStage] = useState<StageIndex | null>(null)
  const [stageResult, setStageResult] = useState<StageResult>({ rank: '-', tooManyTaps: false })

  const goToSelect = () => setScreen('select')

  const goToGame = (stage: StageIndex) => {
    setSelectedStage(stage)
    setScreen('game')
  }

  const goToResult = (result: StageResult) => {
    setStageResult(result)
    if (selectedStage) saveRank(selectedStage.stageId, result.rank)
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
        <ResultScreen result={stageResult} onRetry={goToSelect} onTitle={goToTitle} />
      )}
    </>
  )
}

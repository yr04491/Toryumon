import { useEffect, useRef, useState } from 'react'
import { loadStage } from '../game/stageLoader'
import { preloadImages } from '../game/imagePreloader'
import PrincipalPopup from '../components/PrincipalPopup/PrincipalPopup'
import type { StageIndex, StageData, BlackboardItem } from '../types/stage'
import type { GameResult } from '../App'
import styles from './GameScreen.module.css'

type Props = {
  stage: StageIndex
  onFinish: (result: GameResult) => void
}

type GamePhase =
  | 'loading'
  | 'lesson'
  | 'yamada_wins'
  | 'correct'
  | 'no_mistake_clear'

type TeacherPose = 'normal' | 'smug' | 'nominate'

export default function GameScreen({ stage, onFinish }: Props) {
  const [stageData, setStageData] = useState<StageData | null>(null)
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [showWrongTap, setShowWrongTap] = useState(false)
  const [visibleItems, setVisibleItems] = useState<BlackboardItem[]>([])
  const [yamadaState, setYamadaState] = useState<'hidden' | 'normal' | 'worried' | 'raise'>('hidden')
  const [teacherPose, setTeacherPose] = useState<TeacherPose>('normal')
  const [tappedItem, setTappedItem] = useState<BlackboardItem | null>(null)
  const [userScore, setUserScore] = useState(0)
  const [yamadaScore, setYamadaScore] = useState(0)

  const yamadaWorryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const yamadaRaiseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const yamadaNominateTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const yamadaWinTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lessonTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const yamadaActiveRef = useRef(false)

  const wrongItem = stageData?.blackboard.find(item => !item.isCorrect) ?? null

  useEffect(() => {
    loadStage(stage.stageId).then(async data => {
      const tid = data.teacherId
      await preloadImages([
        './blackboard.png',
        `./assets/characters/${tid}_normal.png`,
        `./assets/characters/${tid}_smug.png`,
        `./assets/characters/${tid}_sweat.png`,
        `./assets/characters/${tid}_nominate.png`,
        './assets/characters/principal_normal.png',
        './assets/characters/principal_anger.png',
        './assets/characters/principal_scolds.png',
        './assets/characters/yamada_normal.png',
        './assets/characters/yamada_worried.png',
        './assets/characters/yamada_raise.png',
        './assets/characters/yamada_win.png',
      ])
      setStageData(data)
      setPhase('lesson')
    })
  }, [stage.stageId])

  useEffect(() => {
    if (!stageData || phase !== 'lesson') return

    let index = 0
    const items = stageData.blackboard

    const showNext = () => {
      if (index >= items.length) {
        if (!wrongItem) {
          lessonTimer.current = setTimeout(() => {
            setPhase('no_mistake_clear')
          }, 5000)
        }
        return
      }

      const item = items[index]
      setVisibleItems(prev => [...prev, item])

      if (!item.isCorrect) {
        armYamadaTimers()
      }

      index++
      lessonTimer.current = setTimeout(showNext, 1800)
    }

    lessonTimer.current = setTimeout(showNext, 800)

    return () => { clearAllTimers() }
  }, [stageData, phase, wrongItem])

  function armYamadaTimers() {
    if (!stageData) return
    const { worriedDelay, raiseDelay, nominateDelay } = stageData.yamada
    yamadaActiveRef.current = true
    setYamadaState('normal')

    yamadaWorryTimer.current = setTimeout(() => {
      if (!yamadaActiveRef.current) return
      setYamadaState('worried')
    }, worriedDelay * 1000)

    yamadaRaiseTimer.current = setTimeout(() => {
      if (!yamadaActiveRef.current) return
      setYamadaState('raise')
    }, raiseDelay * 1000)

    yamadaNominateTimer.current = setTimeout(() => {
      if (!yamadaActiveRef.current) return
      setTeacherPose('nominate')
      yamadaWinTimer.current = setTimeout(() => {
        if (!yamadaActiveRef.current) return
        setYamadaScore(prev => prev + 1)
        setYamadaState('hidden')
        setPhase('yamada_wins')
      }, 1500)
    }, nominateDelay * 1000)
  }

  function clearYamadaTimers() {
    yamadaActiveRef.current = false
    if (yamadaWorryTimer.current) clearTimeout(yamadaWorryTimer.current)
    if (yamadaRaiseTimer.current) clearTimeout(yamadaRaiseTimer.current)
    if (yamadaNominateTimer.current) clearTimeout(yamadaNominateTimer.current)
    if (yamadaWinTimer.current) clearTimeout(yamadaWinTimer.current)
  }

  function clearAllTimers() {
    clearYamadaTimers()
    if (lessonTimer.current) clearTimeout(lessonTimer.current)
  }

  function handleTap(item: BlackboardItem) {
    if (phase !== 'lesson' || showWrongTap) return

    if (item.isCorrect) {
      clearYamadaTimers()
      setTeacherPose('smug')
      setShowWrongTap(true)
    } else {
      clearAllTimers()
      setTappedItem(item)
      setUserScore(prev => prev + 1)
      setPhase('correct')
    }
  }

  function handlePopupClose() {
    onFinish({ userScore, yamadaScore })
  }

  if (phase === 'loading' || !stageData) {
    return <div className={styles.loading}>読み込み中...</div>
  }

  const teacherSrc = () => {
    if (teacherPose === 'smug') return `./assets/characters/${stageData.teacherId}_smug.png`
    if (teacherPose === 'nominate') return `./assets/characters/${stageData.teacherId}_nominate.png`
    return `./assets/characters/${stageData.teacherId}_normal.png`
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <span>{stage.subject === 'math' ? '算数' : stage.subject}</span>
        <span>小学{stage.grade}年生</span>
        <span className={styles.score}>
          あなた {userScore} vs 山田くん {yamadaScore}
        </span>
      </header>

      <div className={styles.gameArea}>
        <div className={styles.blackboardWrap}>
          <img src="./blackboard.png" alt="黒板" className={styles.blackboardBg} />

          <div className={styles.boardText}>
            {visibleItems.map(item => (
              <div
                key={item.id}
                className={`${styles.boardItem} ${!item.isCorrect ? styles.mistakeItem : ''}`}
                onClick={() => handleTap(item)}
              >
                {item.content}
              </div>
            ))}
          </div>

          <div className={styles.teacherWrap}>
            <img
              src={teacherSrc()}
              alt="先生"
              className={styles.teacherImg}
            />
          </div>
        </div>

        {yamadaState !== 'hidden' && (
          <div className={styles.yamadaWrap}>
            <img
              src={
                yamadaState === 'raise'
                  ? './assets/characters/yamada_raise.png'
                  : yamadaState === 'worried'
                  ? './assets/characters/yamada_worried.png'
                  : './assets/characters/yamada_normal.png'
              }
              alt="山田くん"
              className={styles.yamadaImg}
            />
          </div>
        )}
      </div>

      {showWrongTap && (
        <div className={styles.overlay}>
          <div className={styles.wrongPanel}>
            <div className={styles.wrongTop}>
              <img
                src={`./assets/characters/${stageData.teacherId}_smug.png`}
                alt="先生"
                className={styles.wrongTeacherImg}
              />
              <div className={styles.wrongBubble}>
                「え？どこが間違ってるの？<br />ふふ…」
              </div>
            </div>
            <p className={styles.wrongSub}>先生に笑われた…</p>
            <button className={styles.nextBtn} onClick={() => {
              setTeacherPose('normal')
              setShowWrongTap(false)
              if (wrongItem) armYamadaTimers()
            }}>
              授業に戻る
            </button>
          </div>
        </div>
      )}

      {phase === 'yamada_wins' && (
        <div className={styles.overlay}>
          <div className={styles.yamadaPanel}>
            <div className={styles.yamadaTop}>
              <img
                src="./assets/characters/yamada_win.png"
                alt="山田くん"
                className={styles.yamadaWinImg}
              />
              <div className={styles.yamadaWinBubble}>
                「先生！そこ間違ってます！」
              </div>
            </div>
            <p className={styles.yamadaText}>山田くんに先を越された！</p>
            <p className={styles.yamadaSub}>
              {wrongItem && `正しくは「${wrongItem.correctContent}」でした`}
            </p>
            <button className={styles.nextBtn} onClick={handlePopupClose}>次へ</button>
          </div>
        </div>
      )}

      {phase === 'no_mistake_clear' && (
        <div className={styles.overlay}>
          <div className={styles.clearPanel}>
            <p className={styles.clearText}>よく見てたね！</p>
            <p className={styles.clearSub}>今回の板書に間違いはありませんでした</p>
            <button className={styles.nextBtn} onClick={() => onFinish({ userScore: userScore + 1, yamadaScore })}>
              次へ
            </button>
          </div>
        </div>
      )}

      {phase === 'correct' && tappedItem && (
        <PrincipalPopup
          explanation={tappedItem.explanation ?? ''}
          teacherId={stageData.teacherId}
          onClose={handlePopupClose}
        />
      )}
    </div>
  )
}

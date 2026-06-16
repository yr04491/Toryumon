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

type ReportingPhase = 'none' | 'reporting' | 'principal_angry'

type TeacherPose = 'normal' | 'smug' | 'nominate'

export default function GameScreen({ stage, onFinish }: Props) {
  const [stageData, setStageData] = useState<StageData | null>(null)
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [reportingPhase, setReportingPhase] = useState<ReportingPhase>('none')
  const [showWrongTap, setShowWrongTap] = useState(false)
  const [visibleItems, setVisibleItems] = useState<BlackboardItem[]>([])
  const [yamadaState, setYamadaState] = useState<'normal' | 'worried' | 'raise'>('normal')
  const [teacherPose, setTeacherPose] = useState<TeacherPose>('normal')
  const [tappedItem, setTappedItem] = useState<BlackboardItem | null>(null)
  const [userScore, setUserScore] = useState(0)
  const [yamadaScore, setYamadaScore] = useState(0)

  const lessonTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 山田くんのストップウォッチ（経過時間ベース。ポーズ＝tick停止で残り時間を保持）
  const yamadaTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const yamadaElapsedRef = useRef(0)
  const TICK_MS = 100
  // ポップアップ中など、授業全体を一時停止するフラグ
  const pausedRef = useRef(false)

  const wrongItem = stageData?.blackboard.find(item => !item.isCorrect) ?? null

  // オーバーレイと同じ条件(縦画面)でゲームをポーズ/再開
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        pausedRef.current = true
        pauseYamadaClock()
      } else {
        pausedRef.current = false
        if (wrongItem && visibleItems.some(i => i.id === wrongItem.id)) {
          resumeYamadaClock()
        }
      }
    }

    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [wrongItem, visibleItems])

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
      // ポーズ中は進めずに足踏み（板書も山田くんも止める）
      if (pausedRef.current) {
        lessonTimer.current = setTimeout(showNext, 150)
        return
      }

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
        startYamadaClock()
      }

      index++
      lessonTimer.current = setTimeout(showNext, 1800)
    }

    lessonTimer.current = setTimeout(showNext, 800)

    return () => { clearAllTimers() }
  }, [stageData, phase, wrongItem])

  // 最初から（経過時間0）山田くんの時計を回す
  function startYamadaClock() {
    yamadaElapsedRef.current = 0
    setYamadaState('normal')
    resumeYamadaClock()
  }

  // 経過時間を保持したまま時計を進める（ポーズからの再開もこれ）
  function resumeYamadaClock() {
    if (!stageData) return
    if (yamadaTickRef.current) return // 二重起動防止
    const { worriedDelay, raiseDelay, nominateDelay } = stageData.yamada
    const worriedMs = worriedDelay * 1000
    const raiseMs = raiseDelay * 1000
    const nominateMs = nominateDelay * 1000
    const winMs = nominateMs + 1500

    yamadaTickRef.current = setInterval(() => {
      yamadaElapsedRef.current += TICK_MS
      const e = yamadaElapsedRef.current

      // しきい値を超えた瞬間だけ setState（同値なら React が再描画をスキップ）
      if (e >= winMs) {
        stopYamadaClock()
        setYamadaScore(prev => prev + 50)
        setYamadaState('normal')
        setPhase('yamada_wins')
      } else if (e >= nominateMs) {
        setTeacherPose('nominate')
      } else if (e >= raiseMs) {
        setYamadaState('raise')
      } else if (e >= worriedMs) {
        setYamadaState('worried')
      }
    }, TICK_MS)
  }

  // tickだけ止める（経過時間は保持＝再開可能）
  function pauseYamadaClock() {
    if (yamadaTickRef.current) {
      clearInterval(yamadaTickRef.current)
      yamadaTickRef.current = null
    }
  }

  function stopYamadaClock() {
    pauseYamadaClock()
  }

  function clearAllTimers() {
    stopYamadaClock()
    if (lessonTimer.current) clearTimeout(lessonTimer.current)
  }

  function handleTap(item: BlackboardItem) {
    if (phase !== 'lesson' || showWrongTap || reportingPhase !== 'none') return

    pausedRef.current = true
    pauseYamadaClock()
    setTappedItem(item)
    setReportingPhase('reporting')
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
        <div className={styles.stageLayout}>
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

            <div className={styles.teacherWrap} style={{ visibility: phase === 'correct' ? 'hidden' : 'visible' }}>
              <img
                src={teacherSrc()}
                alt="先生"
                className={styles.teacherImg}
              />
            </div>
          </div>

          <div className={styles.yamadaWrap} style={{ visibility: phase === 'yamada_wins' ? 'hidden' : 'visible' }}>
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
        </div>
      </div>

      {reportingPhase === 'reporting' && tappedItem && (
        <div className={styles.overlay}>
          <div className={styles.reportingPanel}>
            <p className={styles.popupHeader}>校長に報告する？</p>
            <p className={styles.reportingText}>「{tappedItem.content}」が間違いだと報告しますか？</p>
            <div className={styles.reportingBtns}>
              <button className={styles.reportBtn} onClick={() => setReportingPhase('principal_angry')}>
                報告する
              </button>
              <button className={styles.cancelBtn} onClick={() => {
                setTappedItem(null)
                setReportingPhase('none')
                pausedRef.current = false
                if (wrongItem && visibleItems.some(i => i.id === wrongItem.id)) resumeYamadaClock()
              }}>
                やめる
              </button>
            </div>
          </div>
        </div>
      )}

      {reportingPhase === 'principal_angry' && (
        <div className={styles.overlay}>
          <div className={styles.principalAngryPanel}>
            <p className={styles.popupHeader}>校長に報告した！</p>
            <div className={styles.principalAngryTop}>
              <img
                src="./assets/characters/principal_anger.png"
                alt="校長"
                className={styles.principalAngryImg}
              />
              <div className={styles.principalAngryBubble}>
                「なにーーー！」
              </div>
            </div>
            <button className={styles.nextBtn} onClick={() => {
              setReportingPhase('none')
              if (tappedItem && !tappedItem.isCorrect) {
                clearAllTimers()
                setUserScore(prev => prev + 50)
                setPhase('correct')
              } else {
                setUserScore(prev => prev - 10)
                setTeacherPose('smug')
                setShowWrongTap(true)
              }
            }}>
              次へ
            </button>
          </div>
        </div>
      )}

      {showWrongTap && (
        <div className={styles.overlay}>
          <div className={styles.wrongPanel}>
            <p className={styles.popupHeader}>間違っていなかった...</p>
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
              pausedRef.current = false
              if (wrongItem && visibleItems.some(i => i.id === wrongItem.id)) resumeYamadaClock()
            }}>
              授業に戻る
            </button>
          </div>
        </div>
      )}

      {phase === 'yamada_wins' && (
        <div className={styles.overlay}>
          <div className={styles.yamadaPanel}>
            <p className={styles.popupHeader}>山田くんに先を越された！</p>
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
            <p className={styles.popupHeader}>ミスはなかった！すごいね！</p>
            <p className={styles.clearSub}>今回の板書に間違いはありませんでした</p>
            <button className={styles.nextBtn} onClick={() => onFinish({ userScore: userScore + 50, yamadaScore })}>
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

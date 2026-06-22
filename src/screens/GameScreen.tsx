import { useEffect, useRef, useState } from 'react'
import { loadStage } from '../game/stageLoader'
import { preloadImages } from '../game/imagePreloader'
import { playBgm, stopBgm, playSe, SOUNDS } from '../game/soundManager'
import PrincipalPopup from '../components/PrincipalPopup/PrincipalPopup'
import SettingsModal from '../components/SettingsModal/SettingsModal'
import type { StageIndex, StageData, BlackboardItem, Rank, RankThresholds } from '../types/stage'
import type { StageResult } from '../App'
import styles from './GameScreen.module.css'

type Props = {
  stage: StageIndex
  onFinish: (result: StageResult) => void
}

type GamePhase =
  | 'loading'
  | 'lesson'
  | 'yamada_wins'
  | 'correct'
  | 'no_mistake_clear'

type ReportingPhase = 'none' | 'reporting' | 'principal_angry'

type TeacherPose = 'normal' | 'smug' | 'nominate'

function computeRank(score: number, t: RankThresholds): Rank {
  if (score >= t.A) return 'A'
  if (score >= t.B) return 'B'
  if (score >= t.C) return 'C'
  return '-'
}

export default function GameScreen({ stage, onFinish }: Props) {
  const [stageData, setStageData] = useState<StageData | null>(null)
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0)
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [reportingPhase, setReportingPhase] = useState<ReportingPhase>('none')
  const [showWrongTap, setShowWrongTap] = useState(false)
  const [visibleItems, setVisibleItems] = useState<BlackboardItem[]>([])
  const [yamadaState, setYamadaState] = useState<'normal' | 'worried' | 'raise'>('normal')
  const [teacherPose, setTeacherPose] = useState<TeacherPose>('normal')
  const [tappedItem, setTappedItem] = useState<BlackboardItem | null>(null)
  const [userScore, setUserScore] = useState(0)
  const [wrongTaps, setWrongTaps] = useState(0)
  const [showSettings, setShowSettings] = useState(false)

  const lessonTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 山田くんのストップウォッチ（経過時間ベース。ポーズ＝tick停止で残り時間を保持）
  const yamadaTickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const yamadaElapsedRef = useRef(0)
  const TICK_MS = 100
  // ポップアップ中など、授業全体を一時停止するフラグ
  const pausedRef = useRef(false)
  // ポーズボタンで設定を開いている間（回転しても勝手に再開させないため）
  const settingsOpenRef = useRef(false)

  const currentProblem = stageData?.problems[currentProblemIndex] ?? null
  const wrongItem = currentProblem?.blackboard.find(item => !item.isCorrect) ?? null
  const isLastProblem = stageData ? currentProblemIndex >= stageData.problems.length - 1 : true

  // オーバーレイと同じ条件(縦画面)でゲームをポーズ/再開
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)')

    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        pausedRef.current = true
        pauseYamadaClock()
      } else {
        if (settingsOpenRef.current) return // 設定（ポーズ）中は再開しない
        pausedRef.current = false
        if (wrongItem && visibleItems.some(i => i.id === wrongItem.id)) {
          resumeYamadaClock()
        }
      }
    }

    mq.addEventListener('change', handleChange)
    return () => mq.removeEventListener('change', handleChange)
  }, [wrongItem, visibleItems])

  // ステージ読み込み＋画像プリロード＋ゲームBGM
  useEffect(() => {
    loadStage(stage.stageId).then(async data => {
      const tid = data.teacherId
      await preloadImages([
        './blackboard2.png',
        `./assets/characters2/${tid}_normal.png`,
        `./assets/characters2/${tid}_smug.png`,
        `./assets/characters2/${tid}_sweat.png`,
        `./assets/characters2/${tid}_nominate.png`,
        './assets/characters2/principal_normal.png',
        './assets/characters2/principal_anger.png',
        './assets/characters2/principal_scolds.png',
        './assets/characters2/yamada_normal.png',
        './assets/characters2/yamada_worried.png',
        './assets/characters2/yamada_raise.png',
        './assets/characters2/yamada_win.png',
      ])
      setStageData(data)
      setPhase('lesson')
    })
    playBgm(SOUNDS.bgmGame)
    return () => { stopBgm() }
  }, [stage.stageId])

  useEffect(() => {
    if (!stageData || !currentProblem || phase !== 'lesson') return

    let index = 0
    const items = currentProblem.blackboard

    const showNext = () => {
      // ポーズ中は進めずに足踏み（板書も山田くんも止める）
      if (pausedRef.current) {
        lessonTimer.current = setTimeout(showNext, 150)
        return
      }

      if (index >= items.length) {
        if (!wrongItem) {
          const { worriedDelay, raiseDelay, nominateDelay } = currentProblem.yamada
          lessonTimer.current = setTimeout(() => {
            setYamadaState('worried')
            lessonTimer.current = setTimeout(() => {
              setYamadaState('raise')
              lessonTimer.current = setTimeout(() => {
                setYamadaState('normal')
                setUserScore(prev => prev + 50)
                setPhase('no_mistake_clear')
              }, (nominateDelay - raiseDelay) * 1000)
            }, (raiseDelay - worriedDelay) * 1000)
          }, worriedDelay * 1000)
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
  }, [stageData, phase, currentProblemIndex])

  // 最初から（経過時間0）山田くんの時計を回す
  function startYamadaClock() {
    yamadaElapsedRef.current = 0
    setYamadaState('normal')
    resumeYamadaClock()
  }

  // 経過時間を保持したまま時計を進める（ポーズからの再開もこれ）
  function resumeYamadaClock() {
    if (!currentProblem) return
    if (yamadaTickRef.current) return // 二重起動防止
    const { worriedDelay, raiseDelay, nominateDelay } = currentProblem.yamada
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
        setYamadaState('normal')
        playSe(SOUNDS.seYamada)
        setPhase('yamada_wins')
      } else if (e >= nominateMs) {
        const hasWrongItem = currentProblem.blackboard.some(item => !item.isCorrect)
        if (!hasWrongItem) {
          stopYamadaClock()
          setYamadaState('normal')
          setUserScore(prev => prev + 50)
          setPhase('no_mistake_clear')
        } else {
          setTeacherPose('nominate')
        }
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

  // ポーズ：全カウント停止＋設定モーダル表示
  function openSettings() {
    settingsOpenRef.current = true
    pausedRef.current = true
    pauseYamadaClock()
    setShowSettings(true)
  }

  function closeSettings() {
    settingsOpenRef.current = false
    setShowSettings(false)
    // 授業中だけ再開（結果ポップアップ表示中はそのまま止めておく）
    if (phase === 'lesson' && reportingPhase === 'none' && !showWrongTap) {
      pausedRef.current = false
      if (wrongItem && visibleItems.some(i => i.id === wrongItem.id)) resumeYamadaClock()
    }
  }

  // 次の問題へ進む（スコア・誤タップ数は持ち越し、それ以外はリセット）
  function goNextProblem() {
    clearAllTimers()
    setVisibleItems([])
    setYamadaState('normal')
    setTeacherPose('normal')
    setTappedItem(null)
    setReportingPhase('none')
    setShowWrongTap(false)
    pausedRef.current = false
    setCurrentProblemIndex(prev => prev + 1)
    setPhase('lesson')
  }

  // 問題結果の「次へ」共通処理：残りがあれば次の問題、無ければ最終リザルトへ
  function handlePopupClose() {
    if (!stageData) return
    if (!isLastProblem) {
      goNextProblem()
      return
    }
    const rank = computeRank(userScore, stageData.rankThresholds)
    if (rank !== '-') playSe(SOUNDS.seClear)
    onFinish({ rank, tooManyTaps: wrongTaps >= 5 })
  }

  if (phase === 'loading' || !stageData || !currentProblem) {
    return <div className={styles.loading}>読み込み中...</div>
  }

  const teacherSrc = () => {
    if (teacherPose === 'smug') return `./assets/characters2/${stageData.teacherId}_smug.png`
    if (teacherPose === 'nominate') return `./assets/characters2/${stageData.teacherId}_nominate.png`
    return `./assets/characters2/${stageData.teacherId}_normal.png`
  }

  return (
    <div
      className={styles.container}
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}background.png)` }}
    >
      <header className={styles.header}>
        <span>{stage.subject === 'math' ? '算数' : stage.subject}</span>
        <span>小学{stage.grade}年生</span>
        {stageData.problems.length > 1 && (
          <span className={styles.progress}>
            問題 {currentProblemIndex + 1} / {stageData.problems.length}
          </span>
        )}
        <button className={styles.pauseBtn} onClick={openSettings} aria-label="ポーズ">
          ⏸
        </button>
      </header>

      <div className={styles.gameArea}>
        <div className={styles.stageLayout}>
          <div className={styles.blackboardWrap}>
            <img src="./blackboard2.png" alt="黒板" className={styles.blackboardBg} />

            <div className={styles.boardText}>
              {visibleItems.map(item => (
                <div
                  key={item.id}
                  className={`${styles.boardItem} ${item.type === 'label' ? styles.labelItem : ''} ${!item.isCorrect ? styles.mistakeItem : ''}`}
                  onClick={() => item.type !== 'label' && handleTap(item)}
                >
                  {item.content.split('\n').map((line, i, arr) => (
                    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                  ))}
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
                  ? './assets/characters2/yamada_raise.png'
                  : yamadaState === 'worried'
                  ? './assets/characters2/yamada_worried.png'
                  : './assets/characters2/yamada_normal.png'
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
                src="./assets/characters2/principal_anger.png"
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
                playSe(SOUNDS.seCorrect)
                setPhase('correct')
              } else {
                setUserScore(prev => prev - 10)
                setWrongTaps(prev => prev + 1)
                setTeacherPose('smug')
                playSe(SOUNDS.seWrong)
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
                src={`./assets/characters2/${stageData.teacherId}_smug.png`}
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
                src="./assets/characters2/yamada_win.png"
                alt="山田くん"
                className={styles.yamadaWinImg}
              />
              <div className={styles.yamadaWinBubble}>
                「先生！そこ間違ってます！」
              </div>
            </div>
            {wrongItem && (
              <>
                <p className={styles.yamadaSub}>間違えているのは「{wrongItem.content}」</p>
                <p className={styles.yamadaSub}>正しくは「{wrongItem.correctContent}」です</p>
              </>
            )}
            <button className={styles.nextBtn} onClick={handlePopupClose}>次へ</button>
          </div>
        </div>
      )}

      {phase === 'no_mistake_clear' && (
        <div className={styles.overlay}>
          <div className={styles.clearPanel}>
            <p className={styles.popupHeader}>ミスはなかった！すごいね！</p>
            <p className={styles.clearSub}>今回の板書に間違いはありませんでした</p>
            <button className={styles.nextBtn} onClick={handlePopupClose}>
              次へ
            </button>
          </div>
        </div>
      )}

      {phase === 'correct' && tappedItem && (
        <PrincipalPopup
          explanation={tappedItem.explanation ?? ''}
          correctContent={tappedItem.correctContent ?? ''}
          teacherId={stageData.teacherId}
          onClose={handlePopupClose}
        />
      )}

      {showSettings && <SettingsModal onClose={closeSettings} />}
    </div>
  )
}

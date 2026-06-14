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
  | 'yamada_wins'       // 山田くんに先越された
  | 'correct'           // 正しく指摘→校長登場
  | 'no_mistake_clear'  // 間違いなし・正しくスルー

export default function GameScreen({ stage, onFinish }: Props) {
  const [stageData, setStageData] = useState<StageData | null>(null)
  const [phase, setPhase] = useState<GamePhase>('loading')
  const [showWrongTap, setShowWrongTap] = useState(false)  // 誤タップオーバーレイ（授業は継続）
  const [visibleItems, setVisibleItems] = useState<BlackboardItem[]>([])
  const [yamadaState, setYamadaState] = useState<'hidden' | 'worried' | 'raise'>('hidden')
  const [tappedItem, setTappedItem] = useState<BlackboardItem | null>(null)
  const [userScore, setUserScore] = useState(0)
  const [yamadaScore, setYamadaScore] = useState(0)

  const yamadaWorryTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const yamadaAnswerTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lessonTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mistakeAppearedAt = useRef<number | null>(null)

  const wrongItem = stageData?.blackboard.find(item => !item.isCorrect) ?? null

  useEffect(() => {
    loadStage(stage.stageId).then(async data => {
      const tid = data.teacherId
      await preloadImages([
        './blackboard.png',
        `./assets/characters/${tid}_normal.png`,
        `./assets/characters/${tid}_smug.png`,
        `./assets/characters/${tid}_sweat.png`,
        './assets/characters/yamada_normal.png',
        './assets/characters/yamada_worried.png',
        './assets/characters/yamada_raise.png',
        './assets/characters/yamada_win.png',
      ])
      setStageData(data)
      setPhase('lesson')
    })
  }, [stage.stageId])

  // 板書を1アイテムずつ順番に表示する
  useEffect(() => {
    if (!stageData || phase !== 'lesson') return

    let index = 0
    const items = stageData.blackboard

    const showNext = () => {
      if (index >= items.length) {
        // 全アイテム表示後、間違いなしなら一定時間後にクリア
        if (!wrongItem) {
          lessonTimer.current = setTimeout(() => {
            setPhase('no_mistake_clear')
          }, 5000)
        }
        return
      }

      const item = items[index]
      setVisibleItems(prev => [...prev, item])

      // 間違いアイテムが表示されたらタイマー開始
      if (!item.isCorrect) {
        mistakeAppearedAt.current = Date.now()
        const { worriedDelay, answerDelay } = stageData.yamada

        yamadaWorryTimer.current = setTimeout(() => {
          setYamadaState('worried')
        }, worriedDelay * 1000)

        yamadaAnswerTimer.current = setTimeout(() => {
          setYamadaState('raise')
          setYamadaScore(prev => prev + 1)
          setPhase('yamada_wins')
        }, answerDelay * 1000)
      }

      index++
      lessonTimer.current = setTimeout(showNext, 1800)
    }

    lessonTimer.current = setTimeout(showNext, 800)

    return () => {
      clearAllTimers()
    }
  }, [stageData, phase, wrongItem])

  function clearAllTimers() {
    if (yamadaWorryTimer.current) clearTimeout(yamadaWorryTimer.current)
    if (yamadaAnswerTimer.current) clearTimeout(yamadaAnswerTimer.current)
    if (lessonTimer.current) clearTimeout(lessonTimer.current)
  }

  function handleTap(item: BlackboardItem) {
    if (phase !== 'lesson' || showWrongTap) return

    if (item.isCorrect) {
      // 誤タップ：タイマーはそのまま、オーバーレイだけ表示
      setShowWrongTap(true)
    } else {
      // 正しく指摘
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
        {/* 黒板 */}
        <div className={styles.blackboardWrap}>
          <img src="./blackboard.png" alt="黒板" className={styles.blackboardBg} />

          {/* 板書テキスト */}
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

          {/* 先生（黒板上に重ねて表示） */}
          <div className={styles.teacherWrap}>
            <img
              src={
                showWrongTap
                  ? `./assets/characters/${stageData.teacherId}_smug.png`
                  : `./assets/characters/${stageData.teacherId}_normal.png`
              }
              alt="先生"
              className={styles.teacherImg}
            />
          </div>
        </div>

        {/* 山田くん（間違い発生時のみ表示） */}
        {yamadaState !== 'hidden' && (
          <div className={styles.yamadaWrap}>
            <img
              src={
                yamadaState === 'worried'
                  ? './assets/characters/yamada_worried.png'
                  : './assets/characters/yamada_raise.png'
              }
              alt="山田くん"
              className={styles.yamadaImg}
            />
          </div>
        )}
      </div>

      {/* 誤タップ演出（授業は裏で継続中） */}
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
            <button className={styles.nextBtn} onClick={() => setShowWrongTap(false)}>
              授業に戻る
            </button>
          </div>
        </div>
      )}

      {/* 山田くんに先越された演出 */}
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

      {/* 間違いなし・正しくスルー */}
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

      {/* 正しく指摘→校長フェーズ */}
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

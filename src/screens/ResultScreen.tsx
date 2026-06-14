import type { GameResult } from '../App'
import styles from './ResultScreen.module.css'

type Props = {
  result: GameResult
  onRetry: () => void
  onTitle: () => void
}

export default function ResultScreen({ result, onRetry, onTitle }: Props) {
  const { userScore, yamadaScore } = result
  const win = userScore > yamadaScore

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={win ? styles.winText : styles.loseText}>
          {win ? '🎉 勝った！' : userScore === yamadaScore ? '引き分け' : '😢 負けた…'}
        </h2>
        <div className={styles.scores}>
          <div className={styles.scoreItem}>
            <span className={styles.scoreName}>あなた</span>
            <span className={styles.scoreNum}>{userScore}</span>
          </div>
          <span className={styles.vs}>vs</span>
          <div className={styles.scoreItem}>
            <span className={styles.scoreName}>山田くん</span>
            <span className={styles.scoreNum}>{yamadaScore}</span>
          </div>
        </div>
        <div className={styles.buttons}>
          <button className={styles.retryBtn} onClick={onRetry}>
            もう一度
          </button>
          <button className={styles.titleBtn} onClick={onTitle}>
            タイトルへ
          </button>
        </div>
      </div>
    </div>
  )
}

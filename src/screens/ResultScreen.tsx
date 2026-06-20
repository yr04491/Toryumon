import type { StageResult } from '../App'
import styles from './ResultScreen.module.css'

type Props = {
  result: StageResult
  onRetry: () => void
  onTitle: () => void
}

export default function ResultScreen({ result, onRetry, onTitle }: Props) {
  const { rank, tooManyTaps } = result
  const cleared = rank !== '-'

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2 className={cleared ? styles.clearText : styles.failText}>
          {cleared ? '🎉 クリア！' : '😢 ステージ失敗…'}
        </h2>

        <div className={styles.rankBox}>
          <span className={styles.rankLabel}>ランク</span>
          <span className={styles.rankValue} data-rank={rank}>{rank}</span>
        </div>

        {tooManyTaps && (
          <p className={styles.tooMany}>間違えてタップし過ぎた！</p>
        )}

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

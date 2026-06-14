import styles from './TitleScreen.module.css'

type Props = { onStart: () => void }

export default function TitleScreen({ onStart }: Props) {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>先生の間違いを見つけろ！</h1>
      <p className={styles.sub}>授業中の板書ミスを見逃すな</p>
      <button className={styles.startBtn} onClick={onStart}>
        スタート
      </button>
    </div>
  )
}

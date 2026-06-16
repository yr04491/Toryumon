import styles from './PrincipalPopup.module.css'

type Props = {
  explanation: string
  teacherId: string
  onClose: () => void
}

export default function PrincipalPopup({ explanation, teacherId, onClose }: Props) {
  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <p className={styles.header}>先生の間違いを指摘した！</p>
        <div className={styles.principal}>
          <img
            src="./assets/characters/principal_scolds.png"
            alt="校長"
            className={styles.principalImg}
          />
          <div className={styles.speechBubble}>
            <p>「こらーっ！何をやっとるんじゃ！！」</p>
          </div>
        </div>
        <div className={styles.teacher}>
          <img
            src={`./assets/characters/${teacherId}_sweat.png`}
            alt="先生"
            className={styles.teacherImg}
          />
          <p className={styles.teacherReaction}>す、すみません…</p>
        </div>
        {explanation && (
          <div className={styles.explanation}>
            <p>📖 {explanation}</p>
          </div>
        )}
        <button className={styles.nextBtn} onClick={onClose}>
          次へ
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import SettingsModal from '../components/SettingsModal/SettingsModal'
import { playBgm, SOUNDS } from '../game/soundManager'
import styles from './TitleScreen.module.css'

type Props = { onStart: () => void }

export default function TitleScreen({ onStart }: Props) {
  const [showSettings, setShowSettings] = useState(false)

  useEffect(() => {
    playBgm(SOUNDS.bgmTitle)
  }, [])

  const handleStart = () => {
    // ユーザー操作のタイミングでBGM再生を確実に開始（autoplay制限対策）
    playBgm(SOUNDS.bgmTitle)
    onStart()
  }

  return (
    <div
      className={styles.container}
      style={{ backgroundImage: `url(${import.meta.env.BASE_URL}blackboard.png)` }}
    >
      <h1 className={styles.title}>先生の間違いを見つけろ！</h1>
      <p className={styles.sub}>授業中の板書ミスを見逃すな</p>
      <button className={styles.startBtn} onClick={handleStart}>
        スタート
      </button>

      <button
        className={styles.settingsBtn}
        onClick={() => setShowSettings(true)}
        aria-label="設定"
      >
        <span className={styles.gear}>⚙</span>
        <span className={styles.settingsLabel}>設定</span>
      </button>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

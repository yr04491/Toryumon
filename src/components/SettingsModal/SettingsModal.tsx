import { useState } from 'react'
import { getVolume, isMuted, setVolume, setMuted } from '../../game/soundManager'
import styles from './SettingsModal.module.css'

type Props = { onClose: () => void }

export default function SettingsModal({ onClose }: Props) {
  const [volume, setVol] = useState(getVolume())
  const [muted, setMut] = useState(isMuted())

  const handleVolume = (v: number) => {
    setVol(v)
    setVolume(v)
  }

  const handleMute = (m: boolean) => {
    setMut(m)
    setMuted(m)
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <p className={styles.title}>設定</p>

        <div className={styles.row}>
          <label className={styles.label}>音量</label>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(volume * 100)}
            onChange={e => handleVolume(Number(e.target.value) / 100)}
            disabled={muted}
            className={styles.slider}
          />
          <span className={styles.value}>{Math.round(volume * 100)}</span>
        </div>

        <label className={styles.muteRow}>
          <input
            type="checkbox"
            checked={muted}
            onChange={e => handleMute(e.target.checked)}
          />
          ミュート
        </label>

        <button className={styles.closeBtn} onClick={onClose}>
          とじる
        </button>
      </div>
    </div>
  )
}

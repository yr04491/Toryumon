// BGM・SE の再生と音量設定を一元管理する。
// 音声ファイルが未配置でも play() の失敗を握りつぶすので、アプリは落ちない。

export const SOUNDS = {
  bgmTitle: './assets/sounds/bgm_title.mp3',
  bgmGame: './assets/sounds/bgm_game.mp3',
  seCorrect: './assets/sounds/se_correct.mp3',
  seWrong: './assets/sounds/se_wrong.mp3',
  seYamada: './assets/sounds/se_yamada.mp3',
  seClear: './assets/sounds/se_clear.mp3',
} as const

type SoundSettings = { volume: number; muted: boolean }

const STORAGE_KEY = 'sound_settings'

function load(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (typeof parsed.volume === 'number' && typeof parsed.muted === 'boolean') {
        return parsed
      }
    }
  } catch {
    /* 壊れていれば既定値 */
  }
  return { volume: 0.6, muted: false }
}

let settings: SoundSettings = load()

const bgmAudio = typeof Audio !== 'undefined' ? new Audio() : null
if (bgmAudio) bgmAudio.loop = true
let currentBgm = ''

function effectiveVolume(): number {
  return settings.muted ? 0 : settings.volume
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function getVolume(): number {
  return settings.volume
}

export function isMuted(): boolean {
  return settings.muted
}

export function setVolume(v: number): void {
  settings.volume = Math.min(1, Math.max(0, v))
  if (bgmAudio) bgmAudio.volume = effectiveVolume()
  persist()
}

export function setMuted(m: boolean): void {
  settings.muted = m
  if (bgmAudio) bgmAudio.volume = effectiveVolume()
  persist()
}

export function playBgm(src: string): void {
  if (!bgmAudio) return
  if (currentBgm === src && !bgmAudio.paused) return
  currentBgm = src
  bgmAudio.src = src
  bgmAudio.volume = effectiveVolume()
  bgmAudio.play().catch(() => {
    /* autoplay制限・ファイル未配置などは無視 */
  })
}

export function stopBgm(): void {
  if (!bgmAudio) return
  bgmAudio.pause()
  currentBgm = ''
}

export function playSe(src: string): void {
  if (typeof Audio === 'undefined') return
  const a = new Audio(src)
  a.volume = effectiveVolume()
  a.play().catch(() => {
    /* ファイル未配置などは無視 */
  })
}

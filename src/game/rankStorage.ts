import type { Rank } from '../types/stage'

const rankOrder: Record<Rank, number> = { '-': 0, C: 1, B: 2, A: 3 }

function key(stageId: string) {
  return `rank_${stageId}`
}

export function getSavedRank(stageId: string): Rank | null {
  const v = localStorage.getItem(key(stageId))
  if (v === 'A' || v === 'B' || v === 'C' || v === '-') return v
  return null
}

// 既存のランクより良いときだけ上書きする（マリオ的にベスト記録を保持）
export function saveRank(stageId: string, rank: Rank): void {
  const prev = getSavedRank(stageId)
  if (prev && rankOrder[prev] >= rankOrder[rank]) return
  localStorage.setItem(key(stageId), rank)
}

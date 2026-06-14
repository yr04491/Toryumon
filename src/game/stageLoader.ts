import type { StageData, StagesIndex } from '../types/stage'

export async function loadStagesIndex(): Promise<StagesIndex> {
  const res = await fetch('./stages/index.json')
  return res.json()
}

export async function loadStage(stageId: string): Promise<StageData> {
  const res = await fetch(`./stages/${stageId}.json`)
  return res.json()
}

export type BlackboardItem = {
  id: string
  type: 'text' | 'label'
  content: string
  isCorrect: boolean
  correctContent?: string
  explanation?: string
}

export type YamadaTiming = {
  worriedDelay: number
  raiseDelay: number
  nominateDelay: number
}

export type Problem = {
  blackboard: BlackboardItem[]
  yamada: YamadaTiming
}

export type RankThresholds = {
  A: number
  B: number
  C: number
}

export type Rank = 'A' | 'B' | 'C' | '-'

export type StageData = {
  stageId: string
  school: 'elementary' | 'middle'
  grade: number
  subject: string
  teacherId: string
  problems: Problem[]
  rankThresholds: RankThresholds
}

export type StageIndex = {
  stageId: string
  school: 'elementary' | 'middle'
  grade: number
  subject: string
  title: string
  difficulty: number
}

export type StagesIndex = {
  stages: StageIndex[]
}

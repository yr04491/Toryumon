export type BlackboardItem = {
  id: string
  type: 'text'
  content: string
  isCorrect: boolean
  correctContent?: string
  explanation?: string
}

export type StageData = {
  stageId: string
  school: 'elementary' | 'middle'
  grade: number
  subject: string
  teacherId: string
  blackboard: BlackboardItem[]
  yamada: {
    worriedDelay: number
    raiseDelay: number
    nominateDelay: number
  }
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

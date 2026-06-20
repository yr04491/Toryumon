import { useEffect, useState } from 'react'
import { loadStagesIndex } from '../game/stageLoader'
import { getSavedRank } from '../game/rankStorage'
import type { StageIndex } from '../types/stage'
import styles from './SelectScreen.module.css'

type Props = { onSelect: (stage: StageIndex) => void }

export default function SelectScreen({ onSelect }: Props) {
  const [stages, setStages] = useState<StageIndex[]>([])

  useEffect(() => {
    loadStagesIndex().then(data => setStages(data.stages))
  }, [])

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>ステージを選択</h2>
      <div className={styles.list}>
        {stages.map(stage => {
          const rank = getSavedRank(stage.stageId)
          return (
            <button key={stage.stageId} className={styles.card} onClick={() => onSelect(stage)}>
              {rank && (
                <span className={styles.rankBadge} data-rank={rank}>{rank}</span>
              )}
              <span className={styles.subject}>{subjectLabel(stage.subject)}</span>
              <span className={styles.info}>
                {schoolLabel(stage.school)} {stage.grade}年生
              </span>
              <span className={styles.stageTitle}>{stage.title}</span>
              <span className={styles.difficulty}>難易度 {'★'.repeat(stage.difficulty)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function schoolLabel(school: string) {
  return school === 'elementary' ? '小学校' : '中学校'
}

function subjectLabel(subject: string) {
  const map: Record<string, string> = {
    math: '算数・数学',
    japanese: '国語',
    science: '理科',
    social: '社会',
    english: '英語',
  }
  return map[subject] ?? subject
}

export type TeacherPose = 'normal' | 'sweat' | 'smug' | 'growth'
export type YamadaPose = 'worried' | 'raise'

export type TeacherData = {
  teacherId: string
  name: string
  images: Record<TeacherPose, string>
}

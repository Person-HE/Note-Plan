export type ReminderType = 'once' | 'progressive' | 'persistent'

export interface Reminder {
  id: string
  taskId: string
  type: ReminderType
  triggerAt: string
  isTriggered: boolean
  snoozedUntil: string | null
  createdAt: string
}

export type ProgressiveStage = '24h' | '1h' | '10min'

export const PROGRESSIVE_DELAYS: Record<ProgressiveStage, number> = {
  '24h': 24 * 60 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '10min': 10 * 60 * 1000,
}

export const PROGRESSIVE_STAGE_ORDER: ProgressiveStage[] = ['24h', '1h', '10min']

export interface DndSettings {
  isEnabled: boolean
  startHour: number
  endHour: number
  allowUrgent: boolean
}

export const DEFAULT_DND_SETTINGS: DndSettings = {
  isEnabled: false,
  startHour: 22,
  endHour: 8,
  allowUrgent: true,
}

export const REMINDER_TYPE_OPTIONS: { label: string; value: ReminderType; description: string }[] = [
  { label: '单次提醒', value: 'once', description: '到时间提醒一次' },
  { label: '递进式提醒', value: 'progressive', description: '24小时 → 1小时 → 10分钟 三级递进' },
  { label: '持续强提醒', value: 'persistent', description: '持续提醒直到确认' },
]

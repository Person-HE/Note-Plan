export type Priority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type ViewMode = 'list' | 'calendar' | 'kanban' | 'timeline'
export type CalendarView = 'day' | 'week' | 'month'
export type ThemeMode = 'light' | 'dark' | 'system'
export type RecurringType = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'

export interface SelectOption<T = string> {
  label: string
  value: T
  color?: string
  icon?: string
}

export interface DateRange {
  start: string
  end: string
}

export interface TimeSlot {
  hour: number
  minute: number
}

export const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bgColor: string; weight: number }> = {
  urgent: { label: '紧急', color: 'text-red-600 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', weight: 4 },
  high: { label: '高', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30', weight: 3 },
  medium: { label: '中', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', weight: 2 },
  low: { label: '低', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800', weight: 1 },
}

export const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '待办', color: 'text-gray-600 dark:text-gray-400', bgColor: 'bg-gray-100 dark:bg-gray-800' },
  in_progress: { label: '进行中', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  completed: { label: '已完成', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  cancelled: { label: '已取消', color: 'text-gray-500 dark:text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
}

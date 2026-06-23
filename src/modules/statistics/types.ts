export interface TaskStats {
  totalTasks: number
  completedTasks: number
  completionRate: number
  inProgressTasks: number
  pendingTasks: number
  cancelledTasks: number
  overdueTasks: number
  totalEstimatedMinutes: number
  totalActualMinutes: number
  averageCompletionMinutes: number
}

export interface HeatmapCell {
  day: number
  hour: number
  value: number
}

export interface TimeDistribution {
  cells: HeatmapCell[]
  maxValue: number
}

export interface PriorityDistribution {
  urgent: number
  high: number
  medium: number
  low: number
  total: number
}

export interface DailySnapshot {
  date: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  totalActualMinutes: number
}

export interface WeeklyReport {
  weekStart: string
  weekEnd: string
  stats: TaskStats
  priorityDistribution: PriorityDistribution
  dailySnapshots: DailySnapshot[]
  topCompletedTasks: string[]
  totalFocusMinutes: number
  streakDays: number
}

export type ExportFormat = 'markdown' | 'csv' | 'html'

export interface ExportOptions {
  format: ExportFormat
  dateRange: { start: string; end: string }
  includeHeatmap: boolean
  includePriority: boolean
  includeDailySnapshots: boolean
}

export interface StatisticsState {
  isLoading: boolean
  currentStats: TaskStats | null
  weeklyStats: TaskStats | null
  monthlyStats: TaskStats | null
  timeDistribution: TimeDistribution | null
  priorityDistribution: PriorityDistribution | null
  weeklyReport: WeeklyReport | null
  dailySnapshots: DailySnapshot[]

  loadStatistics: () => Promise<void>
  getWeeklyReport: () => Promise<WeeklyReport | null>
  exportReport: (options: ExportOptions) => Promise<void>
  refresh: () => Promise<void>
}

export interface Task {
  id: string
  title: string
  description: string
  status: TaskStatus
  priority: Priority
  progress: number
  parentId: string | null
  groupId: string | null
  startDate: string | null
  startTime: string | null
  dueDate: string | null
  dueTime: string | null
  reminderIds: string[]
  dependencyIds: string[]
  attachmentIds: string[]
  isRecurring: boolean
  recurringRule: RecurringRule | null
  isImportant: boolean
  isMigrated: boolean
  estimatedMinutes: number
  actualMinutes: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
  order: number
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface RecurringRule {
  type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'
  interval: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  endDate?: string
}

export interface Group {
  id: string
  name: string
  color: string
  icon: string
  parentId: string | null
  order: number
  createdAt: string
}

export interface TaskFilter {
  status?: TaskStatus[]
  priority?: Priority[]
  groupId?: string | null
  dueDateFrom?: string | null
  dueDateTo?: string | null
  searchQuery?: string
  isImportant?: boolean
  parentId?: string | null
}

export interface TaskSort {
  field: 'createdAt' | 'dueDate' | 'priority' | 'order' | 'title' | 'progress'
  direction: 'asc' | 'desc'
}

export const DEFAULT_TASK: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'order'> = {
  title: '',
  description: '',
  status: 'pending',
  priority: 'medium',
  progress: 0,
  parentId: null,
  groupId: null,
  startDate: null,
  startTime: null,
  dueDate: null,
  dueTime: null,
  reminderIds: [],
  dependencyIds: [],
  attachmentIds: [],
  isRecurring: false,
  recurringRule: null,
  isImportant: false,
  isMigrated: false,
  estimatedMinutes: 0,
  actualMinutes: 0,
  startedAt: null,
  completedAt: null,
}

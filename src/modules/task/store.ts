import { create } from 'zustand'
import { db, type TaskRecord, type GroupRecord, eventBus } from '@/core'
import { generateId, toISODateString, toISODateTimeString } from '@/shared'
import { useSettingsStore } from '@/modules/settings/store'
import type { Task, Group, TaskFilter, TaskSort, RecurringRule } from './types'

interface TaskState {
  tasks: Task[]
  groups: Group[]
  filter: TaskFilter
  sort: TaskSort
  selectedTaskId: string | null
  isLoading: boolean

  loadAll: () => Promise<void>
  createTask: (input: Partial<Task> & { title: string }) => Promise<Task>
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
  completeTask: (id: string) => Promise<void>
  uncompleteTask: (id: string) => Promise<void>
  updateProgress: (id: string, progress: number) => Promise<void>
  setTaskImportant: (id: string, important: boolean) => Promise<void>
  migrateIncompleteTasks: () => Promise<void>
  reorderTasks: (taskIds: string[]) => Promise<void>

  createGroup: (input: { name: string; color: string; icon: string; parentId?: string | null }) => Promise<Group>
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>
  deleteGroup: (id: string) => Promise<void>

  setFilter: (filter: Partial<TaskFilter>) => void
  setSort: (sort: TaskSort) => void
  setSelectedTaskId: (id: string | null) => void
  getFilteredTasks: () => Task[]
  getSubtasks: (parentId: string) => Task[]
  getTaskById: (id: string) => Task | undefined
  getTasksByGroup: (groupId: string) => Task[]
  getImportantTasks: () => Task[]
  getTodayTasks: () => Task[]
  getOverdueTasks: () => Task[]
  getPendingTaskCount: () => number
}

function recordToTask(record: TaskRecord): Task {
  return {
    ...record,
    recurringRule: record.recurringRule && record.recurringRule.trim() !== '' ? JSON.parse(record.recurringRule) as RecurringRule : null,
  }
}

function taskToRecord(task: Task): TaskRecord {
  return {
    ...task,
    recurringRule: task.recurringRule ? JSON.stringify(task.recurringRule) : null,
  }
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  groups: [],
  filter: {},
  sort: { field: 'order', direction: 'asc' },
  selectedTaskId: null,
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true })
    try {
      const [taskRecords, groupRecords] = await Promise.all([
        db.tasks.toArray(),
        db.groups.toArray(),
      ])
      set({
        tasks: taskRecords.map(recordToTask),
        groups: groupRecords as Group[],
        isLoading: false,
      })
    } catch (err) {
      console.error('Failed to load tasks:', err)
      set({ isLoading: false })
    }
  },

  createTask: async (input) => {
    const now = toISODateTimeString(new Date())
    const parentFilter = input.parentId || ''
    const maxOrder = await db.tasks.where('parentId').equals(parentFilter).count()
    const task: Task = {
      id: generateId(),
      title: input.title,
      description: input.description ?? '',
      status: input.status ?? 'pending',
      priority: input.priority ?? 'medium',
      progress: input.progress ?? 0,
      parentId: input.parentId ?? null,
      groupId: input.groupId ?? null,
      startDate: input.startDate ?? null,
      startTime: input.startTime ?? null,
      dueDate: input.dueDate ?? null,
      dueTime: input.dueTime ?? null,
      reminderIds: input.reminderIds ?? [],
      dependencyIds: input.dependencyIds ?? [],
      attachmentIds: input.attachmentIds ?? [],
      isRecurring: input.isRecurring ?? false,
      recurringRule: input.recurringRule ?? null,
      isImportant: input.isImportant ?? false,
      isMigrated: false,
      estimatedMinutes: input.estimatedMinutes ?? 0,
      actualMinutes: 0,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      updatedAt: now,
      order: maxOrder,
    }
    await db.tasks.add(taskToRecord(task))
    set(state => ({ tasks: [...state.tasks, task] }))
    eventBus.emit('task:created', task)

    if (task.dueDate && task.status !== 'completed') {
      try {
        const { useNotificationStore } = await import('@/modules/notification/store')
        const reminderTime = task.dueTime
          ? `${task.dueDate}T${task.dueTime}:00`
          : `${task.dueDate}T09:00:00`
        await useNotificationStore.getState().createReminder({
          taskId: task.id,
          type: 'once',
          triggerAt: reminderTime,
        })
      } catch (err) {
        console.error('Auto-create reminder failed:', err)
      }
    }

    return task
  },

  updateTask: async (id, updates) => {
    const now = toISODateTimeString(new Date())
    const updatedFields = { ...updates, updatedAt: now }
    const record = taskToRecord({ ...updatedFields, id } as Task)
    const updateData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(record)) {
      if (key !== 'id' && updatedFields.hasOwnProperty(key)) {
        updateData[key] = value
      }
    }
    updateData['updatedAt'] = now
    await db.tasks.update(id, updateData as any)
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updatedFields } : t),
    }))
    eventBus.emit('task:updated', { id, ...updates })
  },

  deleteTask: async (id) => {
    const settings = useSettingsStore.getState().settings
    if (settings.confirmBeforeDelete) {
      const task = get().tasks.find(t => t.id === id)
      const taskName = task?.title || '此任务'
      const confirmed = window.confirm(`确定要删除「${taskName}」吗？删除后无法恢复。`)
      if (!confirmed) return
    }

    const subtasks = get().tasks.filter(t => t.parentId === id)
    for (const sub of subtasks) {
      await get().deleteTask(sub.id)
    }
    await db.tasks.delete(id)
    set(state => ({
      tasks: state.tasks.filter(t => t.id !== id),
      selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
    }))
    eventBus.emit('task:deleted', id)
  },

  completeTask: async (id) => {
    const now = toISODateTimeString(new Date())
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const updates = {
      status: 'completed' as const,
      progress: 100,
      completedAt: now,
      actualMinutes: task.startedAt
        ? Math.round((new Date(now).getTime() - new Date(task.startedAt).getTime()) / 60000)
        : task.actualMinutes,
    }
    await db.tasks.update(id, updates as any)
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }))
    eventBus.emit('task:completed', id)
  },

  uncompleteTask: async (id) => {
    const updates = {
      status: 'pending' as const,
      progress: 0,
      completedAt: null,
    }
    await db.tasks.update(id, updates as any)
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }))
    eventBus.emit('task:updated', { id, ...updates })
  },

  updateProgress: async (id, progress) => {
    const task = get().tasks.find(t => t.id === id)
    if (!task) return
    const updates: Partial<Task> = {
      progress,
      status: progress >= 100 ? 'completed' : progress > 0 ? 'in_progress' : 'pending',
      startedAt: task.startedAt ?? (progress > 0 ? toISODateTimeString(new Date()) : null),
      completedAt: progress >= 100 ? toISODateTimeString(new Date()) : null,
    }
    await db.tasks.update(id, updates as any)
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
    }))
    eventBus.emit('task:progress-changed', { id, progress })
  },

  setTaskImportant: async (id, important) => {
    await db.tasks.update(id, { isImportant: important })
    set(state => ({
      tasks: state.tasks.map(t => t.id === id ? { ...t, isImportant: important } : t),
    }))
    eventBus.emit('task:updated', { id, isImportant: important })
  },

  migrateIncompleteTasks: async () => {
    const today = toISODateString(new Date())
    const incompleteTasks = get().tasks.filter(
      t => t.status !== 'completed' && t.status !== 'cancelled' && t.progress < 100 && t.isMigrated === false && t.dueDate && t.dueDate < today
    )
    for (const task of incompleteTasks) {
      await db.tasks.update(task.id, { isMigrated: true, dueDate: today })
    }
    if (incompleteTasks.length > 0) {
      set(state => ({
        tasks: state.tasks.map(t => {
          const shouldMigrate = incompleteTasks.some(it => it.id === t.id)
          return shouldMigrate ? { ...t, isMigrated: true, dueDate: today } : t
        }),
      }))
      eventBus.emit('task:migrated', incompleteTasks.length)
    }
  },

  reorderTasks: async (taskIds) => {
    for (let i = 0; i < taskIds.length; i++) {
      await db.tasks.update(taskIds[i], { order: i })
    }
    set(state => ({
      tasks: state.tasks.map(t => {
        const newOrder = taskIds.indexOf(t.id)
        return newOrder >= 0 ? { ...t, order: newOrder } : t
      }),
    }))
  },

  createGroup: async (input) => {
    const group: Group = {
      id: generateId(),
      name: input.name,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId ?? null,
      order: get().groups.length,
      createdAt: toISODateTimeString(new Date()),
    }
    await db.groups.add(group as GroupRecord)
    set(state => ({ groups: [...state.groups, group] }))
    eventBus.emit('group:created', group)
    return group
  },

  updateGroup: async (id, updates) => {
    await db.groups.update(id, updates)
    set(state => ({
      groups: state.groups.map(g => g.id === id ? { ...g, ...updates } : g),
    }))
    eventBus.emit('group:updated', { id, ...updates })
  },

  deleteGroup: async (id) => {
    await db.groups.delete(id)
    set(state => ({
      groups: state.groups.filter(g => g.id !== id),
      tasks: state.tasks.map(t => t.groupId === id ? { ...t, groupId: null } : t),
    }))
    eventBus.emit('group:deleted', id)
  },

  setFilter: (filter) => {
    set(state => ({ filter: { ...state.filter, ...filter } }))
  },

  setSort: (sort) => {
    set({ sort })
  },

  setSelectedTaskId: (id) => {
    set({ selectedTaskId: id })
  },

  getFilteredTasks: () => {
    const { tasks, filter, sort } = get()
    const filterParentId = filter.parentId ?? null
    let filtered = tasks.filter(t => {
      const tParentId = t.parentId || null
      return tParentId === filterParentId
    })

    if (filter.status?.length) {
      filtered = filtered.filter(t => filter.status!.includes(t.status))
    }
    if (filter.priority?.length) {
      filtered = filtered.filter(t => filter.priority!.includes(t.priority))
    }
    if (filter.groupId !== undefined) {
      filtered = filtered.filter(t => t.groupId === filter.groupId)
    }
    if (filter.isImportant !== undefined) {
      filtered = filtered.filter(t => t.isImportant === filter.isImportant)
    }
    if (filter.dueDateFrom) {
      filtered = filtered.filter(t => t.dueDate && t.dueDate >= filter.dueDateFrom!)
    }
    if (filter.dueDateTo) {
      filtered = filtered.filter(t => t.dueDate && t.dueDate <= filter.dueDateTo!)
    }
    if (filter.searchQuery) {
      const q = filter.searchQuery.toLowerCase()
      filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
    }

    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
    filtered.sort((a, b) => {
      let cmp = 0
      switch (sort.field) {
        case 'priority':
          cmp = priorityWeight[b.priority] - priorityWeight[a.priority]
          break
        case 'dueDate':
          cmp = (a.dueDate && a.dueDate.trim() !== '' ? a.dueDate : 'z').localeCompare(b.dueDate && b.dueDate.trim() !== '' ? b.dueDate : 'z')
          break
        case 'createdAt':
          cmp = b.createdAt.localeCompare(a.createdAt)
          break
        case 'progress':
          cmp = b.progress - a.progress
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'order':
        default:
          cmp = a.order - b.order
      }
      return sort.direction === 'desc' ? -cmp : cmp
    })

    return filtered
  },

  getSubtasks: (parentId) => {
    return get().tasks.filter(t => t.parentId === parentId)
  },

  getTaskById: (id) => {
    return get().tasks.find(t => t.id === id)
  },

  getTasksByGroup: (groupId) => {
    return get().tasks.filter(t => t.groupId === groupId && !t.parentId)
  },

  getImportantTasks: () => {
    return get().tasks.filter(t => t.isImportant && t.status !== 'completed' && t.status !== 'cancelled')
  },

  getTodayTasks: () => {
    const today = toISODateString(new Date())
    return get().tasks.filter(t =>
      t.status !== 'completed' && t.status !== 'cancelled' &&
      (t.dueDate === today || t.isMigrated)
    )
  },

  getOverdueTasks: () => {
    const today = toISODateString(new Date())
    return get().tasks.filter(t =>
      t.status !== 'completed' && t.status !== 'cancelled' &&
      t.dueDate && t.dueDate.trim() !== '' && t.dueDate < today && !t.isMigrated
    )
  },

  getPendingTaskCount: () => {
    return get().tasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length
  },
}))

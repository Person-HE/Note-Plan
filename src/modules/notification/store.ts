import { create } from 'zustand'
import { db, eventBus, type ReminderRecord } from '@/core'
import { generateId, toISODateTimeString, isElectron, sendNotification as sendSystemNotificationViaIPC } from '@/shared'
import { useSettingsStore } from '@/modules/settings/store'
import type { Reminder, ReminderType, ProgressiveStage } from './types'
import { PROGRESSIVE_DELAYS, PROGRESSIVE_STAGE_ORDER } from './types'

interface ActiveNotification {
  reminderId: string
  taskId: string
  type: ReminderType
  triggeredAt: string
  progressiveStage?: ProgressiveStage
}

interface NotificationState {
  reminders: Reminder[]
  activeNotifications: ActiveNotification[]
  isLoading: boolean
  persistentIntervals: Record<string, ReturnType<typeof setInterval>>

  loadAll: () => Promise<void>
  createReminder: (input: { taskId: string; type: ReminderType; triggerAt: string }) => Promise<Reminder>
  updateReminder: (id: string, updates: Partial<Pick<Reminder, 'type' | 'triggerAt'>>) => Promise<void>
  deleteReminder: (id: string) => Promise<void>
  deleteRemindersByTask: (taskId: string) => Promise<void>

  triggerReminder: (id: string) => Promise<void>
  snoozeReminder: (id: string, durationMinutes: number) => Promise<void>
  dismissReminder: (id: string) => Promise<void>

  isDndActive: () => boolean

  checkDueReminders: () => Promise<void>
  getRemindersByTask: (taskId: string) => Reminder[]
  getTriggeredReminders: () => Reminder[]

  sendSystemNotification: (data: { title: string; body: string; taskId: string; type: string }) => Promise<void>
}

function recordToReminder(record: ReminderRecord): Reminder {
  return { ...record }
}

function reminderToRecord(reminder: Reminder): ReminderRecord {
  return { ...reminder }
}

function getNextProgressiveStage(triggerAt: string): ProgressiveStage | undefined {
  const now = Date.now()
  const triggerTime = new Date(triggerAt).getTime()
  const diff = triggerTime - now
  if (diff <= PROGRESSIVE_DELAYS['10min']) return '10min'
  if (diff <= PROGRESSIVE_DELAYS['1h']) return '1h'
  if (diff <= PROGRESSIVE_DELAYS['24h']) return '24h'
  return undefined
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  reminders: [],
  activeNotifications: [],
  isLoading: false,
  persistentIntervals: {},

  loadAll: async () => {
    set({ isLoading: true })
    try {
      const records = await db.reminders.toArray()
      set({
        reminders: records.map(recordToReminder),
        isLoading: false,
      })
    } catch (err) {
      console.error('Failed to load reminders:', err)
      set({ isLoading: false })
    }
  },

  createReminder: async (input) => {
    const now = toISODateTimeString(new Date())
    const reminder: Reminder = {
      id: generateId(),
      taskId: input.taskId,
      type: input.type,
      triggerAt: input.triggerAt,
      isTriggered: false,
      snoozedUntil: null,
      createdAt: now,
    }
    await db.reminders.add(reminderToRecord(reminder))
    set(state => ({ reminders: [...state.reminders, reminder] }))
    eventBus.emit('reminder:created', reminder)
    return reminder
  },

  updateReminder: async (id, updates) => {
    await db.reminders.update(id, updates)
    set(state => ({
      reminders: state.reminders.map(r =>
        r.id === id ? { ...r, ...updates } : r
      ),
    }))
    eventBus.emit('reminder:updated', { id, ...updates })
  },

  deleteReminder: async (id) => {
    await db.reminders.delete(id)
    const intervals = { ...get().persistentIntervals }
    if (intervals[id]) {
      clearInterval(intervals[id])
      delete intervals[id]
    }
    set(state => ({
      reminders: state.reminders.filter(r => r.id !== id),
      activeNotifications: state.activeNotifications.filter(n => n.reminderId !== id),
      persistentIntervals: intervals,
    }))
    eventBus.emit('reminder:deleted', id)
  },

  deleteRemindersByTask: async (taskId) => {
    const taskReminders = get().reminders.filter(r => r.taskId === taskId)
    const ids = taskReminders.map(r => r.id)
    await db.reminders.bulkDelete(ids)
    const intervals = { ...get().persistentIntervals }
    for (const id of ids) {
      if (intervals[id]) {
        clearInterval(intervals[id])
        delete intervals[id]
      }
    }
    set(state => ({
      reminders: state.reminders.filter(r => r.taskId !== taskId),
      activeNotifications: state.activeNotifications.filter(
        n => !ids.includes(n.reminderId)
      ),
      persistentIntervals: intervals,
    }))
  },

  triggerReminder: async (id) => {
    const reminder = get().reminders.find(r => r.id === id)
    if (!reminder) return

    const dndActive = get().isDndActive()
    if (dndActive) {
      const task = await db.tasks.get(reminder.taskId)
      if (task && task.priority !== 'urgent' && task.priority !== 'high') return
    }

    await db.reminders.update(id, { isTriggered: true })
    set(state => ({
      reminders: state.reminders.map(r =>
        r.id === id ? { ...r, isTriggered: true } : r
      ),
    }))

    const notification: ActiveNotification = {
      reminderId: id,
      taskId: reminder.taskId,
      type: reminder.type,
      triggeredAt: toISODateTimeString(new Date()),
      progressiveStage: reminder.type === 'progressive'
        ? getNextProgressiveStage(reminder.triggerAt)
        : undefined,
    }

    set(state => ({
      activeNotifications: [
        ...state.activeNotifications.filter(n => n.reminderId !== id),
        notification,
      ],
    }))

    if (isElectron()) {
      const typeLabels: Record<ReminderType, string> = {
        once: '提醒',
        progressive: '递进提醒',
        persistent: '强提醒',
      }
      await get().sendSystemNotification({
        title: typeLabels[reminder.type],
        body: `任务 ${reminder.taskId.slice(0, 8)}...`,
        taskId: reminder.taskId,
        type: reminder.type,
      })
    }

    eventBus.emit('reminder:triggered', { reminderId: id, taskId: reminder.taskId, type: reminder.type })
  },

  snoozeReminder: async (id, durationMinutes) => {
    const snoozedUntil = toISODateTimeString(new Date(Date.now() + durationMinutes * 60 * 1000))
    await db.reminders.update(id, { snoozedUntil, isTriggered: false })
    const intervals = { ...get().persistentIntervals }
    if (intervals[id]) {
      clearInterval(intervals[id])
      delete intervals[id]
    }
    set(state => ({
      reminders: state.reminders.map(r =>
        r.id === id ? { ...r, snoozedUntil, isTriggered: false } : r
      ),
      activeNotifications: state.activeNotifications.filter(n => n.reminderId !== id),
      persistentIntervals: intervals,
    }))
    eventBus.emit('reminder:snoozed', { reminderId: id, snoozedUntil })
  },

  dismissReminder: async (id) => {
    await db.reminders.update(id, { snoozedUntil: null })
    const intervals = { ...get().persistentIntervals }
    if (intervals[id]) {
      clearInterval(intervals[id])
      delete intervals[id]
    }
    set(state => ({
      reminders: state.reminders.map(r =>
        r.id === id ? { ...r, snoozedUntil: null } : r
      ),
      activeNotifications: state.activeNotifications.filter(n => n.reminderId !== id),
      persistentIntervals: intervals,
    }))
    eventBus.emit('reminder:dismissed', id)
  },

  isDndActive: () => {
    const settings = useSettingsStore.getState().settings
    if (!settings.dndEnabled) return false
    const now = new Date()
    const hour = now.getHours()
    const minute = now.getMinutes()
    const currentTime = hour * 60 + minute
    const [startH, startM] = settings.dndStart.split(':').map(Number)
    const [endH, endM] = settings.dndEnd.split(':').map(Number)
    const startTime = startH * 60 + startM
    const endTime = endH * 60 + endM
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime < endTime
    }
    return currentTime >= startTime && currentTime < endTime
  },

  checkDueReminders: async () => {
    const now = new Date()
    const { reminders, isDndActive } = get()

    for (const reminder of reminders) {
      if (reminder.isTriggered) continue

      const snoozed = reminder.snoozedUntil
        ? new Date(reminder.snoozedUntil) > now
        : false
      if (snoozed) continue

      const triggerTime = new Date(reminder.triggerAt)
      if (triggerTime <= now) {
        if (isDndActive()) {
          const task = await db.tasks.get(reminder.taskId)
          if (task && task.priority !== 'urgent' && task.priority !== 'high') continue
        }
        await get().triggerReminder(reminder.id)
      }
    }

    const activeNotifications = get().activeNotifications
    for (const notification of activeNotifications) {
      if (notification.type === 'progressive' && notification.progressiveStage) {
        const currentIdx = PROGRESSIVE_STAGE_ORDER.indexOf(notification.progressiveStage)
        if (currentIdx < PROGRESSIVE_STAGE_ORDER.length - 1) {
          const nextStage = PROGRESSIVE_STAGE_ORDER[currentIdx + 1]
          const reminder = get().reminders.find(r => r.id === notification.reminderId)
          if (reminder) {
            const stageProgress = getNextProgressiveStage(reminder.triggerAt)
            if (stageProgress && PROGRESSIVE_STAGE_ORDER.indexOf(stageProgress) > currentIdx) {
              set(state => ({
                activeNotifications: state.activeNotifications.map(n =>
                  n.reminderId === notification.reminderId
                    ? { ...n, progressiveStage: stageProgress }
                    : n
                ),
              }))
              if (isElectron()) {
                await get().sendSystemNotification({
                  title: '递进提醒',
                  body: `任务 ${reminder.taskId.slice(0, 8)}... 已升级`,
                  taskId: reminder.taskId,
                  type: 'progressive',
                })
              }
            }
          }
        }
      }

      if (notification.type === 'persistent') {
        const existingIntervals = get().persistentIntervals
        if (!existingIntervals[notification.reminderId]) {
          const intervalId = setInterval(async () => {
            const stillActive = get().activeNotifications.find(
              n => n.reminderId === notification.reminderId
            )
            if (!stillActive) {
              const currentIntervals = { ...get().persistentIntervals }
              if (currentIntervals[notification.reminderId]) {
                clearInterval(currentIntervals[notification.reminderId])
                delete currentIntervals[notification.reminderId]
                set({ persistentIntervals: currentIntervals })
              }
              return
            }
            if (isElectron()) {
              await get().sendSystemNotification({
                title: '强提醒',
                body: `任务 ${notification.taskId.slice(0, 8)}... 仍未确认`,
                taskId: notification.taskId,
                type: 'persistent',
              })
            }
            eventBus.emit('reminder:triggered', {
              reminderId: notification.reminderId,
              taskId: notification.taskId,
              type: 'persistent',
            })
          }, 5 * 60 * 1000)

          set(state => ({
            persistentIntervals: {
              ...state.persistentIntervals,
              [notification.reminderId]: intervalId,
            },
          }))
        }

        eventBus.emit('reminder:triggered', {
          reminderId: notification.reminderId,
          taskId: notification.taskId,
          type: 'persistent',
        })
      }
    }
  },

  getRemindersByTask: (taskId) => {
    return get().reminders.filter(r => r.taskId === taskId)
  },

  getTriggeredReminders: () => {
    return get().reminders.filter(r => r.isTriggered)
  },

  sendSystemNotification: async (data) => {
    if (!isElectron()) return
    await sendSystemNotificationViaIPC(data)
  },
}))

import React, { useState, useEffect } from 'react'
import {
  Bell, Plus, Trash2, Moon, Sun, AlertTriangle, X, Clock,
  ChevronDown, ChevronUp, Timer
} from 'lucide-react'
import { useNotificationStore } from './store'
import { useSettingsStore } from '@/modules/settings/store'
import type { ReminderType, ProgressiveStage } from './types'
import { REMINDER_TYPE_OPTIONS, PROGRESSIVE_STAGE_ORDER } from './types'
import { cn, isElectron } from '@/shared'
import { Button, Input, Select, Checkbox, Badge } from '@/shared/components'

export function ReminderSettings({
  taskId,
  onClose,
}: {
  taskId: string
  onClose: () => void
}) {
  const store = useNotificationStore()
  const reminders = useNotificationStore(s => s.reminders.filter(r => r.taskId === taskId))
  const [isCreating, setIsCreating] = useState(false)
  const [form, setForm] = useState<{
    type: ReminderType
    triggerAt: string
  }>({
    type: 'once',
    triggerAt: '',
  })

  const handleCreate = async () => {
    if (!form.triggerAt) return
    await store.createReminder({
      taskId,
      type: form.type,
      triggerAt: form.triggerAt,
    })
    setForm({ type: 'once', triggerAt: '' })
    setIsCreating(false)
  }

  const handleDelete = async (id: string) => {
    await store.deleteReminder(id)
  }

  const getTypeLabel = (type: ReminderType) => {
    return REMINDER_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type
  }

  const getTypeBadgeVariant = (type: ReminderType): 'default' | 'primary' | 'warning' | 'danger' => {
    switch (type) {
      case 'once': return 'default'
      case 'progressive': return 'primary'
      case 'persistent': return 'danger'
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-surface-700 dark:text-surface-300 flex items-center gap-2">
          <Bell size={16} />
          提醒设置
        </h4>
        <Button size="sm" variant="ghost" onClick={() => setIsCreating(!isCreating)}>
          <Plus size={14} />
        </Button>
      </div>

      {isCreating && (
        <div className="space-y-3 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
          <Select
            label="提醒类型"
            value={form.type}
            onChange={(v) => setForm(f => ({ ...f, type: v as ReminderType }))}
            options={REMINDER_TYPE_OPTIONS.map(o => ({
              label: o.label,
              value: o.value,
            }))}
          />
          <Input
            label="触发时间"
            type="datetime-local"
            value={form.triggerAt}
            onChange={(e) => setForm(f => ({ ...f, triggerAt: e.target.value }))}
          />
          {form.type === 'progressive' && (
            <p className="text-xs text-primary-600 dark:text-primary-400">
              递进式提醒将在截止前 24小时、1小时、10分钟 分别提醒
            </p>
          )}
          {form.type === 'persistent' && (
            <p className="text-xs text-red-600 dark:text-red-400">
              持续强提醒将反复通知，直到你手动确认
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!form.triggerAt}>
              添加
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
              取消
            </Button>
          </div>
        </div>
      )}

      {reminders.length === 0 && !isCreating && (
        <p className="text-xs text-surface-400 text-center py-2">暂无提醒</p>
      )}

      <div className="space-y-2">
        {reminders.map(reminder => (
          <div
            key={reminder.id}
            className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Badge variant={getTypeBadgeVariant(reminder.type)} size="sm">
                {getTypeLabel(reminder.type)}
              </Badge>
              <span className="text-xs text-surface-600 dark:text-surface-400 truncate">
                {new Date(reminder.triggerAt).toLocaleString('zh-CN')}
              </span>
              {reminder.isTriggered && (
                <Badge variant="success" size="sm">已触发</Badge>
              )}
              {reminder.snoozedUntil && (
                <Badge variant="warning" size="sm">贪睡中</Badge>
              )}
            </div>
            <button
              onClick={() => handleDelete(reminder.id)}
              className="p-1 text-surface-400 hover:text-red-500 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReminderNotification() {
  const store = useNotificationStore()
  const activeNotifications = useNotificationStore(s => s.activeNotifications)
  const electron = isElectron()

  useEffect(() => {
    const interval = setInterval(() => {
      store.checkDueReminders()
    }, 30000)
    store.checkDueReminders()
    return () => clearInterval(interval)
  }, [])

  if (electron) return null

  if (activeNotifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[90] space-y-2 max-w-sm w-full">
      {activeNotifications.map(notification => (
        <NotificationCard
          key={notification.reminderId}
          notification={notification}
        />
      ))}
    </div>
  )
}

function NotificationCard({
  notification,
}: {
  notification: {
    reminderId: string
    taskId: string
    type: ReminderType
    triggeredAt: string
    progressiveStage?: ProgressiveStage
  }
}) {
  const store = useNotificationStore()
  const [snoozeMinutes, setSnoozeMinutes] = useState(10)

  const handleDismiss = () => {
    store.dismissReminder(notification.reminderId)
  }

  const handleSnooze = () => {
    store.snoozeReminder(notification.reminderId, snoozeMinutes)
  }

  const getTypeIcon = () => {
    switch (notification.type) {
      case 'once': return <Bell size={20} className="text-primary-500" />
      case 'progressive': return <Timer size={20} className="text-orange-500" />
      case 'persistent': return <AlertTriangle size={20} className="text-red-500 animate-pulse" />
    }
  }

  const getTypeLabel = () => {
    switch (notification.type) {
      case 'once': return '提醒'
      case 'progressive': {
        const stageLabels: Record<ProgressiveStage, string> = {
          '24h': '24小时前',
          '1h': '1小时前',
          '10min': '10分钟前',
        }
        return notification.progressiveStage
          ? `递进提醒 · ${stageLabels[notification.progressiveStage]}`
          : '递进提醒'
      }
      case 'persistent': return '强提醒'
    }
  }

  const getCardStyle = () => {
    switch (notification.type) {
      case 'once': return 'border-primary-200 bg-primary-50 dark:border-primary-800 dark:bg-primary-900/30'
      case 'progressive': return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/30'
      case 'persistent': return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/30 ring-2 ring-red-400/50 animate-pulse'
    }
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 shadow-lg animate-slide-in',
        getCardStyle(),
      )}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{getTypeIcon()}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-surface-900 dark:text-surface-100">
              {getTypeLabel()}
            </span>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg text-surface-400 hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-xs text-surface-600 dark:text-surface-400 mt-1">
            任务 {notification.taskId.slice(0, 8)}...
          </p>
          {notification.type === 'progressive' && notification.progressiveStage && (
            <div className="flex items-center gap-1 mt-2">
              {PROGRESSIVE_STAGE_ORDER.map(stage => (
                <div
                  key={stage}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-all',
                    PROGRESSIVE_STAGE_ORDER.indexOf(stage) <= PROGRESSIVE_STAGE_ORDER.indexOf(notification.progressiveStage!)
                      ? 'bg-orange-500'
                      : 'bg-surface-200 dark:bg-surface-700'
                  )}
                />
              ))}
            </div>
          )}
          {notification.type === 'persistent' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
              此提醒将持续显示，直到你确认
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-200/50 dark:border-surface-700/50">
        <Button size="sm" onClick={handleDismiss}>
          知道了
        </Button>
        <div className="flex items-center gap-1 ml-auto">
          <select
            value={snoozeMinutes}
            onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
            className="text-xs bg-transparent border border-surface-300 dark:border-surface-600 rounded px-1.5 py-1 text-surface-700 dark:text-surface-300"
          >
            <option value={5}>5分钟</option>
            <option value={10}>10分钟</option>
            <option value={30}>30分钟</option>
            <option value={60}>1小时</option>
          </select>
          <Button size="sm" variant="ghost" onClick={handleSnooze}>
            <Clock size={14} />
            贪睡
          </Button>
        </div>
      </div>
    </div>
  )
}

export function DndToggle() {
  const settings = useSettingsStore(s => s.settings)
  const setDndEnabled = useSettingsStore(s => s.setDndEnabled)
  const [showSettings, setShowSettings] = useState(false)

  const handleToggleDnd = () => {
    setDndEnabled(!settings.dndEnabled)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <button
          onClick={handleToggleDnd}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200',
            settings.dndEnabled
              ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-surface-100 text-surface-600 dark:bg-surface-800 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-700'
          )}
        >
          {settings.dndEnabled ? <Moon size={16} /> : <Sun size={16} />}
          <span className="text-sm font-medium">
            {settings.dndEnabled ? '免打扰已开启' : '免打扰'}
          </span>
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1.5 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
        >
          {showSettings ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {showSettings && (
        <DndSettingsPanel />
      )}
    </div>
  )
}

function DndSettingsPanel() {
  const settings = useSettingsStore(s => s.settings)
  const setDndTime = useSettingsStore(s => s.setDndTime)

  return (
    <div className="space-y-3 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-surface-600 dark:text-surface-400">
            开始时间
          </label>
          <input
            type="time"
            value={settings.dndStart}
            onChange={(e) => setDndTime(e.target.value, settings.dndEnd)}
            className="w-full text-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-2 py-1.5 text-surface-900 dark:text-surface-100"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-surface-600 dark:text-surface-400">
            结束时间
          </label>
          <input
            type="time"
            value={settings.dndEnd}
            onChange={(e) => setDndTime(settings.dndStart, e.target.value)}
            className="w-full text-sm bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-2 py-1.5 text-surface-900 dark:text-surface-100"
          />
        </div>
      </div>

      <p className="text-xs text-surface-400">
        免打扰时段: {settings.dndStart} - {settings.dndEnd}
      </p>
    </div>
  )
}

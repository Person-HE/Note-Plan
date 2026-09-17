import React, { useEffect, useState, useMemo, useCallback, lazy, Suspense, type ReactNode } from 'react'
import { useViewStore } from '@/modules/view'
import { Sidebar, Header, CalendarView } from '@/modules/view'
import { TaskList, TaskDetailPanel, QuickAddTask, GroupManager, TaskFilterBar } from '@/modules/task'
import { useTaskStore } from '@/modules/task'
import { ReminderNotification, DndToggle } from '@/modules/notification'
import { useNotificationStore } from '@/modules/notification'
import { useInspirationStickyStore } from '@/modules/inspiration-sticky'
import { useNoteStore } from '@/modules/note'
import { DesktopPet } from '@/modules/pet'
import { useTheme, useKeyboard } from '@/shared/hooks'
import { usePlatform } from '@/shared'
import { cn, isTouchDevice, isElectron, onNotificationClicked, onDataChanged, removeDataChangedListener, removeNotificationClickedListener, setCloseToTray } from '@/shared'
import { useSettingsStore } from '@/modules/settings/store'
import { FloatingApp } from '@/modules/view'
import { Icon } from '@/shared/Icons'

const StatisticsPanel = lazy(() => import('@/modules/statistics').then(m => ({ default: m.StatisticsPanel })))
const SettingsPanel = lazy(() => import('@/modules/settings').then(m => ({ default: m.SettingsPanel })))
const InspirationStickyBoard = lazy(() => import('@/modules/inspiration-sticky').then(m => ({ default: m.InspirationStickyBoard })))
const KnowledgeBaseView = lazy(() => import('@/modules/note').then(m => ({ default: m.KnowledgeBaseView })))
const SyncPanel = lazy(() => import('@/modules/sync').then(m => ({ default: m.SyncPanel })))

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-12" style={{ color: 'var(--ink-gray)' }}>
      <span className="font-hand text-lg">加载中...</span>
    </div>
  )
}

function TodayView() {
  const store = useTaskStore()
  const todayTasks = useTaskStore(s => s.getTodayTasks())
  const overdueTasks = useTaskStore(s => s.getOverdueTasks())
  const importantTasks = useTaskStore(s => s.getImportantTasks())
  const selectedTaskId = useTaskStore(s => s.selectedTaskId)
  const { isPhone } = usePlatform()

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {overdueTasks.length > 0 && (
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <Icon name="error" size={16} style={{ color: 'var(--accent-red)' }} />
              <h3 className="font-hand text-base font-bold" style={{ color: 'var(--accent-red)' }}>逾期任务</h3>
              <span className="tag-hand" style={{ background: 'var(--watercolor-pink)' }}>{overdueTasks.length}</span>
            </div>
            <div className="space-y-1">
              {overdueTasks.map(task => (
                <TaskItem key={task.id} task={task} onSelect={(id) => store.setSelectedTaskId(id)} isSelected={selectedTaskId === task.id} />
              ))}
            </div>
          </div>
        )}

        {importantTasks.length > 0 && (
          <div className="mb-4 md:mb-6">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <Icon name="star" size={16} style={{ color: 'var(--accent-orange)' }} />
              <h3 className="font-hand text-base font-bold" style={{ color: 'var(--ink-black)' }}>最重要的事</h3>
            </div>
            <div className="space-y-1">
              {importantTasks.slice(0, 3).map(task => (
                <TaskItem key={task.id} task={task} onSelect={(id) => store.setSelectedTaskId(id)} isSelected={selectedTaskId === task.id} />
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <h3 className="font-hand text-base font-bold" style={{ color: 'var(--ink-black)' }}>今日待办</h3>
            <span className="text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>{todayTasks.filter(t => t.status === 'completed').length}/{todayTasks.length} 已完成</span>
          </div>
          <QuickAddTask defaultDueDate={new Date().toISOString().split('T')[0]} />
          <div className="mt-3 space-y-1">
            {todayTasks.length > 0 ? (
              todayTasks.map(task => (
                <TaskItem key={task.id} task={task} onSelect={(id) => store.setSelectedTaskId(id)} isSelected={selectedTaskId === task.id} />
              ))
            ) : (
              <div className="text-center py-8 font-hand" style={{ color: 'var(--ink-light)' }}>
                <p>今天没有待办任务 <Icon name="sparkle" size={14} style={{ color: 'var(--accent-orange)', verticalAlign: 'middle' }} /></p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTaskId && (
        <div className={cn('shrink-0', isPhone ? 'h-[50vh] border-t' : 'w-[400px] max-w-full border-l')} style={{ borderColor: 'var(--ink-black)' }}>
          <TaskDetailPanel />
        </div>
      )}
    </div>
  )
}

function ImportantView() {
  const store = useTaskStore()
  const importantTasks = useTaskStore(s => s.getImportantTasks())
  const selectedTaskId = useTaskStore(s => s.selectedTaskId)
  const { isPhone } = usePlatform()

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <QuickAddTask />
        <div className="mt-4">
          {importantTasks.length > 0 ? (
            <div className="space-y-1">
              {importantTasks.map(task => (
                <TaskItem key={task.id} task={task} onSelect={(id) => store.setSelectedTaskId(id)} isSelected={selectedTaskId === task.id} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12" style={{ color: 'var(--ink-gray)' }}>
              <Icon name="star" size={40} style={{ color: 'var(--accent-orange)' }} />
              <p className="font-hand text-lg">暂无重要任务</p>
              <p className="text-sm mt-1">点击任务的星标来标记为重要</p>
            </div>
          )}
        </div>
      </div>
      {selectedTaskId && (
        <div className={cn('shrink-0', isPhone ? 'h-[50vh] border-t' : 'w-[400px] max-w-full border-l')} style={{ borderColor: 'var(--ink-black)' }}>
          <TaskDetailPanel />
        </div>
      )}
    </div>
  )
}

function AllTasksView() {
  const selectedTaskId = useTaskStore(s => s.selectedTaskId)
  const { isPhone } = usePlatform()

  return (
    <div className="flex h-full flex-col md:flex-row">
      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <TaskFilterBar />
        <div className="mt-4">
          <QuickAddTask />
          <div className="mt-3">
            {isPhone ? (
              <TaskList />
            ) : (
              <div className="flex gap-6">
                <div className="flex-1">
                  <TaskList />
                </div>
                <div className="w-56 shrink-0">
                  <GroupManager />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {selectedTaskId && (
        <div className={cn('shrink-0', isPhone ? 'h-[50vh] border-t' : 'w-[400px] max-w-full border-l')} style={{ borderColor: 'var(--ink-black)' }}>
          <TaskDetailPanel />
        </div>
      )}
    </div>
  )
}

function MainContent() {
  const activeTab = useViewStore(s => s.activeTab)

  switch (activeTab) {
    case 'today':
      return <TodayView />
    case 'important':
      return <ImportantView />
    case 'tasks':
      return <AllTasksView />
    case 'inspirationSticky':
      return (
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <Suspense fallback={<LazyFallback />}><InspirationStickyBoard /></Suspense>
        </div>
      )
    case 'knowledge':
      return (
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <Suspense fallback={<LazyFallback />}><KnowledgeBaseView /></Suspense>
        </div>
      )
    case 'calendar':
      return <CalendarView />
    case 'statistics':
      return (
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <Suspense fallback={<LazyFallback />}><StatisticsPanel /></Suspense>
        </div>
      )
    case 'settings':
      return (
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <Suspense fallback={<LazyFallback />}><SettingsPanel /></Suspense>
        </div>
      )
    case 'sync':
      return (
        <div className="flex-1 overflow-y-auto p-3 md:p-6">
          <Suspense fallback={<LazyFallback />}><SyncPanel /></Suspense>
        </div>
      )
    default:
      return <TodayView />
  }
}

const TaskItem = React.memo(function TaskItem({ task, onSelect, isSelected }: { task: { id: string; title: string; status: string; priority: string; isImportant: boolean; isMigrated: boolean; dueDate: string | null; dueTime: string | null; progress: number; estimatedMinutes: number }; onSelect: (id: string) => void; isSelected: boolean }) {
  const store = useTaskStore()
  const priorityConfig: Record<string, { label: string; icon: ReactNode }> = {
    urgent: { label: '紧急', icon: <Icon name="dot-red" size={12} /> },
    high: { label: '高', icon: <Icon name="dot-orange" size={12} /> },
    medium: { label: '中', icon: <Icon name="dot-blue" size={12} /> },
    low: { label: '低', icon: <Icon name="dot-gray" size={12} /> },
  }
  const pc = priorityConfig[task.priority] || priorityConfig.medium

  return (
    <div
      className={cn(
        'group flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-all card-hand',
        task.isMigrated && 'border-l-4',
      )}
      style={{
        borderColor: task.isMigrated ? 'var(--accent-red)' : undefined,
        background: isSelected ? 'var(--watercolor-yellow)' : 'var(--paper-bg)',
      }}
      onClick={() => onSelect(task.id)}
    >
      <button
        onClick={(e) => { e.stopPropagation(); task.status === 'completed' ? store.uncompleteTask(task.id) : store.completeTask(task.id) }}
        className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
        style={{
          background: task.status === 'completed' ? 'var(--accent-green)' : 'transparent',
          borderColor: 'var(--ink-black)',
        }}
      >
        {task.status === 'completed' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <span className={cn('font-hand text-sm font-bold', task.status === 'completed' && 'line-through opacity-50')} style={{ color: 'var(--ink-black)' }}>
          {task.title}
        </span>
      </div>
      {task.isImportant && <span><Icon name="star" size={14} style={{ color: 'var(--accent-orange)' }} /></span>}
      <span className="tag-hand text-xs">{pc.icon} {pc.label}</span>
    </div>
  )
})

function MobileBottomNav() {
  const activeTab = useViewStore(s => s.activeTab)
  const setActiveTab = useViewStore(s => s.setActiveTab)
  const todayCount = useTaskStore(s => s.getTodayTasks().length)
  const importantCount = useTaskStore(s => s.getImportantTasks().length)

  const tabs: { id: typeof activeTab; icon: ReactNode; label: string; badge?: number }[] = [
    { id: 'today', icon: <Icon name="target" size={18} />, label: '今日', badge: todayCount },
    { id: 'important', icon: <Icon name="star" size={18} />, label: '重要', badge: importantCount },
    { id: 'tasks', icon: <Icon name="todo" size={18} />, label: '全部' },
    { id: 'inspirationSticky', icon: <Icon name="lightbulb" size={18} />, label: '灵感' },
    { id: 'knowledge', icon: <Icon name="book" size={18} />, label: '知识' },
  ]

  return (
    <div className="flex items-center justify-around safe-area-bottom"
      style={{
        background: 'var(--paper-bg)',
        borderTop: '2px dashed var(--ink-light)',
        padding: '4px 0 env(safe-area-inset-bottom, 8px)',
      }}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className="flex flex-col items-center gap-0.5 px-2 py-1"
          style={{ color: activeTab === tab.id ? 'var(--accent-orange)' : 'var(--ink-gray)' }}
        >
          <span className="text-lg">{tab.icon}</span>
          <span className="text-[10px] font-hand font-bold">{tab.label}</span>
          {tab.badge !== undefined && tab.badge > 0 && (
            <span className="absolute -top-0.5 right-0 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] rounded-full px-0.5"
              style={{ background: 'var(--accent-red)', color: 'white' }}>
              {tab.badge > 9 ? '9+' : tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  const isFloatingMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return window.location.search.includes('mode=floating')
  }, [])

  if (isFloatingMode) {
    return <FloatingApp />
  }

  const { theme, toggleTheme } = useTheme()
  const { isPhone, isTouch } = usePlatform()
  const isSidebarCollapsed = useViewStore(s => s.isSidebarCollapsed)
  const taskStore = useTaskStore()
  const notificationStore = useNotificationStore()
  const inspirationStickyStore = useInspirationStickyStore()
  const noteStore = useNoteStore()
  const [isReady, setIsReady] = useState(false)
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  useKeyboard('ctrl+shift+n', () => {
    taskStore.setSelectedTaskId('__new__')
  })

  useEffect(() => {
    if (isTouch) {
      document.documentElement.classList.add('touch-device')
    }
  }, [isTouch])

  useEffect(() => {
    const init = async () => {
      // 一次性清理旧版本注入的模拟数据
      try {
        const { db, clearAllData } = await import('@/core/database')
        const seedVersion = await db.settings.get('seedVersion')
        if (seedVersion) {
          await clearAllData()
          console.log('[Init] 已清理旧版本模拟数据')
        }
      } catch (err) {
        console.error('[Init] 清理数据失败:', err)
      }

      await taskStore.loadAll()
      await notificationStore.loadAll()
      await inspirationStickyStore.loadAll()
      await noteStore.loadAll()
      await taskStore.migrateIncompleteTasks()
      setIsReady(true)
    }
    init()
  }, [])

  useEffect(() => {
    if (isElectron()) {
      onDataChanged(async (data) => {
        if (data.type === 'task') {
          await taskStore.loadAll()
        } else if (data.type === 'inspirationSticky') {
          await inspirationStickyStore.loadAll()
        }
      })

      onNotificationClicked((data) => {
        if (data.taskId) {
          taskStore.setSelectedTaskId(data.taskId)
          useViewStore.getState().setActiveTab('today')
        }
      })

      return () => {
        removeDataChangedListener()
        removeNotificationClickedListener()
      }
    }
  }, [])

  // 响应式订阅 settings 并应用到 DOM
  const settings = useSettingsStore(s => s.settings)
  const settingsLoaded = useSettingsStore(s => s.isLoaded)

  useEffect(() => {
    if (!settingsLoaded) {
      useSettingsStore.getState().load()
    }
  }, [settingsLoaded])

  // 将“关闭到托盘”设置同步到主进程，决定点击关闭按钮时是退出还是最小化到托盘
  useEffect(() => {
    if (settingsLoaded && isElectron()) {
      setCloseToTray(settings.closeToTray)
    }
  }, [settingsLoaded, settings.closeToTray])

  useEffect(() => {
    document.documentElement.setAttribute('data-font-size', settings.fontSizeCustom ? 'custom' : settings.fontSize)
    document.documentElement.setAttribute('data-density', settings.layoutDensity)
    document.documentElement.setAttribute('data-sidebar', settings.sidebarPosition)
    document.documentElement.setAttribute('data-animation', String(settings.animationEnabled))
    document.documentElement.lang = settings.language
    if (settings.fontSizeCustom > 0) {
      document.documentElement.style.fontSize = `${settings.fontSizeCustom}px`
    } else {
      document.documentElement.style.fontSize = ''
    }
  }, [settings.fontSize, settings.layoutDensity, settings.sidebarPosition, settings.animationEnabled, settings.fontSizeCustom, settings.language])

  // 当 defaultView 设置变更时同步到 view store
  useEffect(() => {
    useViewStore.getState().setCurrentView(settings.defaultView)
  }, [settings.defaultView])

  if (!isReady) {
    return (
      <div className="h-screen flex items-center justify-center paper-texture safe-area-top">
        <div className="text-center">
          <Icon name="note" size={40} style={{ color: 'var(--ink-light)' }} />
          <p className="font-hand text-xl" style={{ color: 'var(--ink-gray)' }}>加载中...</p>
        </div>
      </div>
    )
  }

  if (isPhone) {
    return (
      <>
        <div className="h-screen flex flex-col paper-texture overflow-hidden safe-area-top">
          <Header />
          <div className="flex-1 overflow-hidden">
            <MainContent />
          </div>
          <MobileBottomNav />
          <ReminderNotification />
        </div>
        <DesktopPet />
      </>
    )
  }

  return (
    <>
      <div className="h-screen flex paper-texture overflow-hidden">
        <Sidebar />
        <div className="main-content flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
            <div className="flex items-center gap-2">
              <DndToggle />
            </div>
            <div className="flex items-center gap-2">
              <button onClick={toggleTheme} className="btn-hand" style={{ padding: '4px 8px', minHeight: 'auto' }}>
                {theme === 'dark' ? <Icon name="sun" size={16} /> : <Icon name="moon" size={16} />}
              </button>
            </div>
          </div>
          <Header />
          <div className="flex-1 overflow-auto">
            <MainContent />
          </div>
        </div>
        <ReminderNotification />
      </div>
      <DesktopPet />
    </>
  )
}

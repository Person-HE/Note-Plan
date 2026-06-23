import React, { useState, useMemo } from 'react'
import {
  CheckSquare, ChevronLeft, ChevronRight, Plus,
  AlertCircle, Layout,
} from 'lucide-react'
import { Icon } from '@/shared/Icons'
import { useViewStore } from './store'
import { useTaskStore } from '@/modules/task/store'
import { useInspirationStickyStore } from '@/modules/inspiration-sticky/store'
import { useSettingsStore } from '@/modules/settings/store'
import { cn, toISODateString, formatRelativeDate, isToday, isSameDay, parseISO, addDays, subDays, startOfWeek, endOfWeek, getWeekDays, isElectron, toggleFloatingWindow } from '@/shared'
import type { SidebarTab, CalendarView } from './types'

export function FloatingWidget() {
  const isExpanded = useViewStore(s => s.isWidgetExpanded)
  const toggleWidget = useViewStore(s => s.toggleWidget)
  const pendingCount = useTaskStore(s => s.getPendingTaskCount())

  if (isExpanded) return null

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={toggleWidget}
        className="btn-hand btn-hand-primary w-14 h-14 rounded-full"
      >
        <CheckSquare size={24} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>
    </div>
  )
}

export function Sidebar() {
  const activeTab = useViewStore(s => s.activeTab)
  const setActiveTab = useViewStore(s => s.setActiveTab)
  const isCollapsed = useViewStore(s => s.isSidebarCollapsed)
  const toggleSidebar = useViewStore(s => s.toggleSidebar)
  const importantCount = useTaskStore(s => s.getImportantTasks().length)
  const todayCount = useTaskStore(s => s.getTodayTasks().length)
  const overdueCount = useTaskStore(s => s.getOverdueTasks().length)
  const stickyCount = useInspirationStickyStore(s => s.items.length)
  const showLabels = useSettingsStore(s => s.settings.showSidebarLabels)

  const tabs: { id: SidebarTab; iconName: string; label: string; badge?: number }[] = [
    { id: 'today', iconName: 'target', label: '今日待办', badge: todayCount },
    { id: 'important', iconName: 'star', label: '重要任务', badge: importantCount },
    { id: 'tasks', iconName: 'todo', label: '全部任务' },
    { id: 'inspirationSticky', iconName: 'lightbulb', label: '灵感便签', badge: stickyCount },
    { id: 'knowledge', iconName: 'note', label: '知识库' },
    { id: 'calendar', iconName: 'calendar', label: '日历视图' },
    { id: 'statistics', iconName: 'chart', label: '数据统计' },
    { id: 'settings', iconName: 'settings', label: '设置' },
  ]

  return (
    <div className={cn(
      'sidebar-container flex flex-col h-full transition-all duration-300',
      isCollapsed ? 'w-16' : 'w-56'
    )} style={{ background: 'var(--paper-bg)', borderRight: 'var(--border-sketch)' }}>
      <div className="flex items-center justify-between px-3 py-4" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Icon name="edit" size={24} />
            <span className="font-hand text-xl font-bold" style={{ color: 'var(--ink-black)' }}>Note-Plan</span>
          </div>
        )}
        <button onClick={toggleSidebar} className="btn-hand" style={{ padding: '4px 8px', minHeight: 'auto' }}>
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <nav className="flex-1 py-2 px-2 space-y-1 overflow-y-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isCollapsed && 'justify-center px-0'
            )}
            style={{
              fontFamily: 'var(--font-hand)',
              fontSize: '1.05rem',
              border: activeTab === tab.id ? 'var(--border-sketch)' : '2px solid transparent',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: activeTab === tab.id ? 'var(--shadow-sketch-sm)' : 'none',
              background: activeTab === tab.id ? 'var(--accent-orange)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--ink-black)',
              transform: activeTab === tab.id ? 'translate(-1px, -1px)' : 'none',
            }}
          >
            <Icon name={tab.iconName} size={16} className="shrink-0" />
            {!isCollapsed && showLabels && (
              <>
                <span className="flex-1 text-left truncate">{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="min-w-[18px] h-[18px] flex items-center justify-center text-[10px] rounded-full px-1"
                    style={{
                      background: activeTab === tab.id ? 'rgba(255,255,255,0.3)' : 'var(--watercolor-yellow)',
                      border: 'var(--border-sketch)',
                      borderWidth: '1px',
                      color: activeTab === tab.id ? 'white' : 'var(--ink-black)',
                    }}>
                    {tab.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {overdueCount > 0 && !isCollapsed && (
        <div className="mx-3 mb-3 p-2.5" style={{ background: 'var(--watercolor-pink)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-md)' }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--accent-red)' }}>
            <AlertCircle size={14} />
            <span className="text-xs font-medium font-hand">{overdueCount}个任务已逾期</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function CalendarView() {
  const calendarView = useViewStore(s => s.calendarView)
  const setCalendarView = useViewStore(s => s.setCalendarView)
  const selectedDate = useViewStore(s => s.selectedDate)
  const setSelectedDate = useViewStore(s => s.setSelectedDate)
  const tasks = useTaskStore(s => s.tasks)
  const store = useTaskStore()

  const parsedDate = parseISO(selectedDate)
  const weekDays = useMemo(() => getWeekDays(parsedDate), [selectedDate])

  const getTasksForDate = (date: string) => {
    return tasks.filter(t => t.dueDate === date && t.status !== 'completed' && t.status !== 'cancelled')
  }

  const goToToday = () => setSelectedDate(toISODateString(new Date()))
  const goBack = () => setSelectedDate(toISODateString(subDays(parsedDate, calendarView === 'day' ? 1 : 7)))
  const goForward = () => setSelectedDate(toISODateString(addDays(parsedDate, calendarView === 'day' ? 1 : 7)))

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
        <div className="flex items-center gap-2">
          <button className="btn-hand" style={{ padding: '4px 8px', minHeight: 'auto' }} onClick={goBack}>
            <ChevronLeft size={16} />
          </button>
          <button className="btn-hand" style={{ padding: '4px 12px', minHeight: 'auto' }} onClick={goToToday}>今天</button>
          <button className="btn-hand" style={{ padding: '4px 8px', minHeight: 'auto' }} onClick={goForward}>
            <ChevronRight size={16} />
          </button>
          <h3 className="font-hand text-lg font-bold ml-2" style={{ color: 'var(--ink-black)' }}>
            {formatRelativeDate(selectedDate)}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          {(['day', 'week', 'month'] as CalendarView[]).map(view => (
            <button
              key={view}
              onClick={() => setCalendarView(view)}
              className="btn-hand"
              style={{
                padding: '4px 12px',
                minHeight: 'auto',
                fontSize: '0.85rem',
                background: calendarView === view ? 'var(--accent-orange)' : 'var(--paper-bg)',
                color: calendarView === view ? 'white' : 'var(--ink-black)',
              }}
            >
              {view === 'day' ? '日' : view === 'week' ? '周' : '月'}
            </button>
          ))}
        </div>
      </div>

      {calendarView === 'week' && (
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
            {weekDays.map(day => {
              const dateStr = toISODateString(day)
              const dayTasks = getTasksForDate(dateStr)
              const isCurrentDay = isToday(day)
              const isSelected = isSameDay(day, parsedDate)

              return (
                <div
                  key={dateStr}
                  className={cn('min-h-[120px] p-2 cursor-pointer transition-colors')}
                  style={{
                    borderRight: '1px dashed var(--ink-light)',
                    background: isSelected ? 'var(--watercolor-yellow)' : isCurrentDay ? 'var(--watercolor-blue)' : 'transparent',
                  }}
                  onClick={() => setSelectedDate(dateStr)}
                >
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--ink-gray)' }}>
                    {['一', '二', '三', '四', '五', '六', '日'][day.getDay() === 0 ? 6 : day.getDay() - 1]}
                  </div>
                  <div className={cn('w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium')}
                    style={{
                      background: isCurrentDay ? 'var(--accent-orange)' : 'transparent',
                      color: isCurrentDay ? 'white' : 'var(--ink-black)',
                      border: !isCurrentDay ? 'var(--border-sketch)' : 'none',
                      borderWidth: !isCurrentDay ? '1px' : '0',
                    }}>
                    {day.getDate()}
                  </div>
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="text-[10px] px-1 py-0.5 rounded truncate cursor-pointer"
                        style={{
                          background: task.isImportant ? 'var(--watercolor-yellow)' : task.priority === 'urgent' ? 'var(--watercolor-pink)' : 'var(--watercolor-blue)',
                          border: '1px solid var(--ink-black)',
                          borderRadius: 'var(--border-radius-sm)',
                        }}
                        onClick={(e) => { e.stopPropagation(); store.setSelectedTaskId(task.id) }}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div className="text-[10px] pl-1" style={{ color: 'var(--ink-light)' }}>+{dayTasks.length - 3}更多</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {calendarView === 'day' && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-2">
            {getTasksForDate(selectedDate).map(task => (
              <div
                key={task.id}
                className="card-hand flex items-center gap-3 cursor-pointer"
                onClick={() => store.setSelectedTaskId(task.id)}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); store.completeTask(task.id) }}
                  className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0')}
                  style={{
                    background: task.status === 'completed' ? 'var(--accent-green)' : 'transparent',
                    borderColor: 'var(--ink-black)',
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-hand text-sm font-bold truncate" style={{ color: 'var(--ink-black)' }}>{task.title}</span>
                    {task.isImportant && <Icon name="star" size={14} style={{ color: 'var(--accent-orange)' }} />}
                  </div>
                  {task.dueTime && <span className="text-xs" style={{ color: 'var(--ink-gray)' }}>{task.dueTime}</span>}
                </div>
                <span className="tag-hand">{PRIORITY_CONFIG[task.priority].label}</span>
              </div>
            ))}
            {getTasksForDate(selectedDate).length === 0 && (
              <div className="text-center py-12" style={{ color: 'var(--ink-gray)' }}>
                <Icon name="calendar" size={40} style={{ color: 'var(--ink-light)' }} />
                <p className="font-hand text-lg">今日暂无待办</p>
              </div>
            )}
          </div>
        </div>
      )}

      {calendarView === 'month' && (
        <MonthCalendar selectedDate={parsedDate} onSelectDate={setSelectedDate} getTasksForDate={getTasksForDate} />
      )}
    </div>
  )
}

function MonthCalendar({
  selectedDate,
  onSelectDate,
  getTasksForDate,
}: {
  selectedDate: Date
  onSelectDate: (date: string) => void
  getTasksForDate: (date: string) => { id: string; title: string; isImportant: boolean; priority: string }[]
}) {
  const start = startOfWeek(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1), { weekStartsOn: 1 })
  const end = endOfWeek(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0), { weekStartsOn: 1 })
  const days = useMemo(() => {
    const result: Date[] = []
    let current = start
    while (current <= end) {
      result.push(current)
      current = addDays(current, 1)
    }
    return result
  }, [selectedDate])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="grid grid-cols-7 text-center" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
        {['一', '二', '三', '四', '五', '六', '日'].map(d => (
          <div key={d} className="py-2 text-xs font-medium font-hand" style={{ color: 'var(--ink-gray)' }}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dateStr = toISODateString(day)
          const dayTasks = getTasksForDate(dateStr)
          const isCurrentDay = isToday(day)
          const isCurrentMonth = day.getMonth() === selectedDate.getMonth()

          return (
            <div
              key={dateStr}
              className={cn('min-h-[80px] p-1.5 cursor-pointer transition-colors', !isCurrentMonth && 'opacity-40')}
              style={{ borderBottom: '1px dashed var(--ink-light)', borderRight: '1px dashed var(--ink-light)', background: isCurrentDay ? 'var(--watercolor-yellow)' : 'transparent' }}
              onClick={() => onSelectDate(dateStr)}
            >
              <div className={cn('w-6 h-6 flex items-center justify-center rounded-full text-xs')}
                style={{
                  background: isCurrentDay ? 'var(--accent-orange)' : 'transparent',
                  color: isCurrentDay ? 'white' : 'var(--ink-black)',
                  fontWeight: isCurrentDay ? 'bold' : 'normal',
                }}>
                {day.getDate()}
              </div>
              {dayTasks.length > 0 && (
                <div className="mt-0.5 flex gap-0.5 flex-wrap">
                  {dayTasks.slice(0, 2).map(t => (
                    <div key={t.id} className="w-1.5 h-1.5 rounded-full"
                      style={{ background: t.priority === 'urgent' ? 'var(--accent-red)' : t.isImportant ? 'var(--accent-orange)' : 'var(--accent-blue)' }} />
                  ))}
                  {dayTasks.length > 2 && <span className="text-[8px]" style={{ color: 'var(--ink-light)' }}>+{dayTasks.length - 2}</span>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function Header() {
  const activeTab = useViewStore(s => s.activeTab)
  const store = useTaskStore()
  const todayCount = useTaskStore(s => s.getTodayTasks().length)
  const importantCount = useTaskStore(s => s.getImportantTasks().length)

  const titles: Record<SidebarTab, string> = {
    today: '今日待办',
    important: '重要任务',
    tasks: '全部任务',
    inspirationSticky: '灵感便签',
    knowledge: '知识库',
    calendar: '日历视图',
    statistics: '数据统计',
    settings: '设置',
    sync: '数据同步',
  }

  return (
    <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
      <div>
        <h1 className="font-hand text-2xl font-bold" style={{ color: 'var(--ink-black)' }}>{titles[activeTab]}</h1>
        {activeTab === 'today' && todayCount > 0 && (
          <p className="text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>今日有 {todayCount} 项待办</p>
        )}
        {activeTab === 'important' && importantCount > 0 && (
          <p className="text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>{importantCount} 项重要任务</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        {isElectron() && (
          <button className="btn-hand" onClick={toggleFloatingWindow} title="切换悬浮窗">
            <Layout size={16} />
          </button>
        )}
        {(activeTab === 'today' || activeTab === 'tasks' || activeTab === 'important') && (
          <button className="btn-hand btn-hand-primary" onClick={() => store.setSelectedTaskId('__new__')}>
            <Plus size={16} /> 新建任务
          </button>
        )}
      </div>
    </div>
  )
}

const PRIORITY_CONFIG: Record<string, { label: string }> = {
  urgent: { label: '紧急' },
  high: { label: '高' },
  medium: { label: '中' },
  low: { label: '低' },
}

export type ViewMode = 'list' | 'calendar' | 'kanban' | 'timeline'
export type CalendarView = 'day' | 'week' | 'month'
export type SidebarTab = 'today' | 'important' | 'tasks' | 'inspirationSticky' | 'knowledge' | 'calendar' | 'statistics' | 'settings' | 'sync'

export interface ViewState {
  currentView: ViewMode
  calendarView: CalendarView
  activeTab: SidebarTab
  isWidgetExpanded: boolean
  isSidebarCollapsed: boolean
  selectedDate: string
}

import { create } from 'zustand'
import { toISODateString } from '@/shared'
import type { ViewMode, CalendarView, SidebarTab } from './types'

interface ViewStoreState {
  currentView: ViewMode
  calendarView: CalendarView
  activeTab: SidebarTab
  isWidgetExpanded: boolean
  isSidebarCollapsed: boolean
  selectedDate: string

  setCurrentView: (view: ViewMode) => void
  setCalendarView: (view: CalendarView) => void
  setActiveTab: (tab: SidebarTab) => void
  toggleWidget: () => void
  setWidgetExpanded: (expanded: boolean) => void
  toggleSidebar: () => void
  setSelectedDate: (date: string) => void
}

export const useViewStore = create<ViewStoreState>((set) => ({
  currentView: 'list',
  calendarView: 'week',
  activeTab: 'today',
  isWidgetExpanded: true,
  isSidebarCollapsed: false,
  selectedDate: toISODateString(new Date()),

  setCurrentView: (view) => set({ currentView: view }),
  setCalendarView: (view) => set({ calendarView: view }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleWidget: () => set(s => ({ isWidgetExpanded: !s.isWidgetExpanded })),
  setWidgetExpanded: (expanded) => set({ isWidgetExpanded: expanded }),
  toggleSidebar: () => set(s => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setSelectedDate: (date) => set({ selectedDate: date }),
}))

import { create } from 'zustand'
import { eventBus } from '@/core'
import type { AppSettings } from './types'
import { DEFAULT_SETTINGS } from './types'

const SETTINGS_KEY = 'note-plan-settings'

interface SettingsState {
  settings: AppSettings
  isLoaded: boolean

  load: () => void
  updateSettings: (updates: Partial<AppSettings>) => void
  setTheme: (theme: AppSettings['theme']) => void
  setLanguage: (language: string) => void
  setAutoStart: (enabled: boolean) => void
  setHotkey: (action: string, key: string) => void
  setDefaultView: (view: AppSettings['defaultView']) => void
  setDndEnabled: (enabled: boolean) => void
  setDndTime: (start: string, end: string) => void
  setDailyTarget: (count: number) => void
  setBufferTimePercent: (percent: number) => void
  setForgivenessCount: (count: number) => void
  setNotificationPermission: (permission: AppSettings['notificationPermission']) => void
  setCloseToTray: (enabled: boolean) => void
  setFloatingWindowEnabled: (enabled: boolean) => void
  setDataStoragePath: (path: string) => void
  setFontSize: (fontSize: AppSettings['fontSize']) => void
  setLayoutDensity: (layoutDensity: AppSettings['layoutDensity']) => void
  setSidebarPosition: (sidebarPosition: AppSettings['sidebarPosition']) => void
  setShowSidebarLabels: (showSidebarLabels: boolean) => void
  setSwipeGestures: (swipeGestures: boolean) => void
  setHapticFeedback: (hapticFeedback: boolean) => void
  setConfirmBeforeDelete: (confirmBeforeDelete: boolean) => void
  setAutoSaveInterval: (autoSaveInterval: number) => void
  setSyncEnabled: (syncEnabled: boolean) => void
  setSyncMethod: (syncMethod: AppSettings['syncMethod']) => void
  setAutoSync: (autoSync: boolean) => void
  setSyncInterval: (syncInterval: number) => void
  setLastSyncTime: (lastSyncTime: string | null) => void
  setLockEnabled: (lockEnabled: boolean) => void
  setLockMethod: (lockMethod: AppSettings['lockMethod']) => void
  setLockTimeout: (lockTimeout: number) => void
  setFontSizeCustom: (fontSizeCustom: number) => void
  setAnimationEnabled: (animationEnabled: boolean) => void
  resetToDefaults: () => void
}

function persistSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    console.error('Failed to persist settings')
  }
}

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<AppSettings>
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    console.error('Failed to load settings')
  }
  return { ...DEFAULT_SETTINGS }
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: { ...DEFAULT_SETTINGS },
  isLoaded: false,

  load: () => {
    const settings = loadSettings()
    set({ settings, isLoaded: true })
  },

  updateSettings: (updates) => {
    set(state => {
      const newSettings = { ...state.settings, ...updates }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', updates)
  },

  setTheme: (theme) => {
    set(state => {
      const newSettings = { ...state.settings, theme }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { theme })
  },

  setLanguage: (language) => {
    set(state => {
      const newSettings = { ...state.settings, language }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { language })
  },

  setAutoStart: (enabled) => {
    set(state => {
      const newSettings = { ...state.settings, autoStart: enabled }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { autoStart: enabled })
  },

  setHotkey: (action, key) => {
    set(state => {
      const newSettings = { ...state.settings, hotkeys: { ...state.settings.hotkeys, [action]: key } }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { hotkeys: { ...get().settings.hotkeys, [action]: key } })
  },

  setDefaultView: (view) => {
    set(state => {
      const newSettings = { ...state.settings, defaultView: view }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { defaultView: view })
  },

  setDndEnabled: (enabled) => {
    set(state => {
      const newSettings = { ...state.settings, dndEnabled: enabled }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { dndEnabled: enabled })
  },

  setDndTime: (start, end) => {
    set(state => {
      const newSettings = { ...state.settings, dndStart: start, dndEnd: end }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { dndStart: start, dndEnd: end })
  },

  setDailyTarget: (count) => {
    set(state => {
      const newSettings = { ...state.settings, dailyTarget: count }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { dailyTarget: count })
  },

  setBufferTimePercent: (percent) => {
    set(state => {
      const newSettings = { ...state.settings, bufferTimePercent: percent }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { bufferTimePercent: percent })
  },

  setForgivenessCount: (count) => {
    set(state => {
      const newSettings = { ...state.settings, forgivenessCount: count }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { forgivenessCount: count })
  },

  setNotificationPermission: (permission) => {
    set(state => {
      const newSettings = { ...state.settings, notificationPermission: permission }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { notificationPermission: permission })
  },

  setCloseToTray: (enabled) => {
    set(state => {
      const newSettings = { ...state.settings, closeToTray: enabled }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { closeToTray: enabled })
  },

  setFloatingWindowEnabled: (enabled) => {
    set(state => {
      const newSettings = { ...state.settings, floatingWindowEnabled: enabled }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { floatingWindowEnabled: enabled })
  },

  setDataStoragePath: (path) => {
    set(state => {
      const newSettings = { ...state.settings, dataStoragePath: path }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { dataStoragePath: path })
  },

  setFontSize: (fontSize) => {
    set(state => {
      const newSettings = { ...state.settings, fontSize }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { fontSize })
  },

  setLayoutDensity: (layoutDensity) => {
    set(state => {
      const newSettings = { ...state.settings, layoutDensity }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { layoutDensity })
  },

  setSidebarPosition: (sidebarPosition) => {
    set(state => {
      const newSettings = { ...state.settings, sidebarPosition }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { sidebarPosition })
  },

  setShowSidebarLabels: (showSidebarLabels) => {
    set(state => {
      const newSettings = { ...state.settings, showSidebarLabels }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { showSidebarLabels })
  },

  setSwipeGestures: (swipeGestures) => {
    set(state => {
      const newSettings = { ...state.settings, swipeGestures }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { swipeGestures })
  },

  setHapticFeedback: (hapticFeedback) => {
    set(state => {
      const newSettings = { ...state.settings, hapticFeedback }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { hapticFeedback })
  },

  setConfirmBeforeDelete: (confirmBeforeDelete) => {
    set(state => {
      const newSettings = { ...state.settings, confirmBeforeDelete }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { confirmBeforeDelete })
  },

  setAutoSaveInterval: (autoSaveInterval) => {
    set(state => {
      const newSettings = { ...state.settings, autoSaveInterval }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { autoSaveInterval })
  },

  setSyncEnabled: (syncEnabled) => {
    set(state => {
      const newSettings = { ...state.settings, syncEnabled }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { syncEnabled })
  },

  setSyncMethod: (syncMethod) => {
    set(state => {
      const newSettings = { ...state.settings, syncMethod }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { syncMethod })
  },

  setAutoSync: (autoSync) => {
    set(state => {
      const newSettings = { ...state.settings, autoSync }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { autoSync })
  },

  setSyncInterval: (syncInterval) => {
    set(state => {
      const newSettings = { ...state.settings, syncInterval }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { syncInterval })
  },

  setLastSyncTime: (lastSyncTime) => {
    set(state => {
      const newSettings = { ...state.settings, lastSyncTime }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { lastSyncTime })
  },

  setLockEnabled: (lockEnabled) => {
    set(state => {
      const newSettings = { ...state.settings, lockEnabled }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { lockEnabled })
  },

  setLockMethod: (lockMethod) => {
    set(state => {
      const newSettings = { ...state.settings, lockMethod }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { lockMethod })
  },

  setLockTimeout: (lockTimeout) => {
    set(state => {
      const newSettings = { ...state.settings, lockTimeout }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { lockTimeout })
  },

  setFontSizeCustom: (fontSizeCustom) => {
    set(state => {
      const newSettings = { ...state.settings, fontSizeCustom }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { fontSizeCustom })
  },

  setAnimationEnabled: (animationEnabled) => {
    set(state => {
      const newSettings = { ...state.settings, animationEnabled }
      persistSettings(newSettings)
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { animationEnabled })
  },

  resetToDefaults: () => {
    persistSettings({ ...DEFAULT_SETTINGS })
    set({ settings: { ...DEFAULT_SETTINGS } })
    eventBus.emit('settings:changed', DEFAULT_SETTINGS)
  },
}))

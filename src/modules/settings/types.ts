export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  language: string
  autoStart: boolean
  hotkeys: Record<string, string>
  defaultView: 'list' | 'calendar' | 'kanban' | 'timeline'
  dndEnabled: boolean
  dndStart: string
  dndEnd: string
  dailyTarget: number
  bufferTimePercent: number
  forgivenessCount: number
  notificationPermission: 'granted' | 'denied' | 'default'
  closeToTray: boolean
  floatingWindowEnabled: boolean
  dataStoragePath: string
  fontSize: 'small' | 'medium' | 'large'
  layoutDensity: 'compact' | 'comfortable' | 'spacious'
  sidebarPosition: 'left' | 'right'
  showSidebarLabels: boolean
  swipeGestures: boolean
  hapticFeedback: boolean
  confirmBeforeDelete: boolean
  autoSaveInterval: number

  // 数据同步
  syncEnabled: boolean
  syncMethod: 'webdav' | 'export_import' | 'lan'
  autoSync: boolean
  syncInterval: number
  lastSyncTime: string | null

  // 隐私与安全
  lockEnabled: boolean
  lockMethod: 'pin' | 'password' | 'biometric'
  lockTimeout: number // 不活动分钟数后自动锁定

  // 高级
  fontSizeCustom: number // 自定义字号(px)，0表示使用预设
  animationEnabled: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'zh-CN',
  autoStart: false,
  hotkeys: {
    'newTask': 'Ctrl+N',
    'search': 'Ctrl+K',
    'toggleSidebar': 'Ctrl+B',
    'quickCapture': 'Ctrl+Shift+N',
    'goToday': 'Ctrl+T',
  },
  defaultView: 'list',
  dndEnabled: false,
  dndStart: '22:00',
  dndEnd: '08:00',
  dailyTarget: 5,
  bufferTimePercent: 20,
  forgivenessCount: 3,
  notificationPermission: 'default',
  closeToTray: false,
  floatingWindowEnabled: false,
  dataStoragePath: '',
  fontSize: 'medium',
  layoutDensity: 'comfortable',
  sidebarPosition: 'left',
  showSidebarLabels: true,
  swipeGestures: true,
  hapticFeedback: true,
  confirmBeforeDelete: true,
  autoSaveInterval: 30,
  syncEnabled: false,
  syncMethod: 'export_import',
  autoSync: false,
  syncInterval: 30,
  lastSyncTime: null,
  lockEnabled: false,
  lockMethod: 'pin',
  lockTimeout: 5,
  fontSizeCustom: 0,
  animationEnabled: true,
}

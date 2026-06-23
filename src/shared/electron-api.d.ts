export interface ElectronAPI {
  sendNotification: (data: { title: string; body: string; taskId: string; type: string }) => Promise<{ success: boolean; error?: string }>
  requestNotificationPermission: () => Promise<string>
  getNotificationPermissionStatus: () => Promise<string>
  dismissNotification: (data: { taskId: string; type: string }) => Promise<{ success: boolean }>
  minimizeToTray: () => Promise<{ success: boolean }>
  showWindow: () => Promise<{ success: boolean }>
  selectDataPath: () => Promise<string | null>
  getDataPath: () => Promise<string>
  migrateData: (newPath: string) => Promise<boolean>
  toggleFloatingWindow: () => Promise<{ success: boolean }>
  showFloatingWindow: () => Promise<{ success: boolean }>
  hideFloatingWindow: () => Promise<{ success: boolean }>
  setFloatingAlwaysOnTop: (flag: boolean) => Promise<{ success: boolean; alwaysOnTop: boolean }>
  getFloatingAlwaysOnTop: () => Promise<{ success: boolean; alwaysOnTop: boolean }>
  notifyDataChanged: (data: { type: string; id?: string }) => Promise<void>
  onDataChanged: (callback: (data: { type: string; id?: string }) => void) => void
  removeDataChangedListener: () => void
  onNotificationClicked: (callback: (data: { taskId: string; type: string }) => void) => void
  onNotificationClosed: (callback: (data: { taskId: string; type: string }) => void) => void
  removeNotificationClickedListener: () => void
  removeNotificationClosedListener: () => void
  fetchContent: (url: string) => Promise<{ success: boolean; data?: { source: string; title: string; content: string; author: string; coverImage?: string; sourceUrl: string }; error?: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}

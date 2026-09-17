export interface ElectronAPI {
  sendNotification: (data: { title: string; body: string; taskId: string; type: string }) => Promise<{ success: boolean; error?: string }>
  requestNotificationPermission: () => Promise<string>
  getNotificationPermissionStatus: () => Promise<string>
  dismissNotification: (data: { taskId: string; type: string }) => Promise<{ success: boolean }>
  minimizeToTray: () => Promise<{ success: boolean }>
  showWindow: () => Promise<{ success: boolean }>
  setCloseToTray: (enabled: boolean) => Promise<{ success: boolean }>
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
  callAI: (config: { apiBaseUrl: string; apiKey: string; model: string }, payload: { messages: Array<{ role: string; content: string }>; max_tokens?: number; stream?: boolean; tools?: unknown }) => Promise<{ success: boolean; data?: { content: string; raw?: unknown }; error?: string }>
  testAI: (config: { apiBaseUrl: string; apiKey: string; model: string }) => Promise<{ success: boolean; message: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}

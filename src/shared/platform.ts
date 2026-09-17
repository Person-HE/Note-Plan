export type Platform = 'web' | 'ios' | 'android' | 'electron'
export type FormFactor = 'phone' | 'tablet' | 'desktop'

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'web'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('electron')) return 'electron'
  if (ua.includes('iphone') || ua.includes('ipad') || (ua.includes('macintosh') && 'ontouchend' in document)) return 'ios'
  if (ua.includes('android')) return 'android'
  return 'web'
}

export function detectFormFactor(): FormFactor {
  if (typeof window === 'undefined') return 'desktop'
  const ua = navigator.userAgent.toLowerCase()
  const isMobileUA = /iphone|android.*mobile|windows phone/i.test(navigator.userAgent)
  const isTabletUA = /ipad|android(?!.*mobile)|tablet/i.test(navigator.userAgent)
  if (isTabletUA) return 'tablet'
  if (isMobileUA) return 'phone'
  if (window.innerWidth < 768) return 'phone'
  if (window.innerWidth < 1024) return 'tablet'
  return 'desktop'
}

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true
}

export function getSafeAreaInsets() {
  const style = getComputedStyle(document.documentElement)
  return {
    top: parseInt(style.getPropertyValue('--sat') || '0'),
    right: parseInt(style.getPropertyValue('--sar') || '0'),
    bottom: parseInt(style.getPropertyValue('--sab') || '0'),
    left: parseInt(style.getPropertyValue('--sal') || '0'),
  }
}

export function isElectron(): boolean {
  if (typeof window === 'undefined') return false
  return !!window.electronAPI || detectPlatform() === 'electron'
}

export async function sendNotification(data: { title: string; body: string; taskId: string; type: string }): Promise<void> {
  if (!isElectron() || !window.electronAPI) return
  await window.electronAPI.sendNotification(data)
}

export async function requestNotificationPermission(): Promise<string> {
  if (!isElectron() || !window.electronAPI) return 'default'
  return window.electronAPI.requestNotificationPermission()
}

export async function getNotificationPermissionStatus(): Promise<string> {
  if (!isElectron() || !window.electronAPI) return 'default'
  return window.electronAPI.getNotificationPermissionStatus()
}

export async function selectDataPath(): Promise<string | null> {
  if (!isElectron() || !window.electronAPI) return null
  return window.electronAPI.selectDataPath()
}

export async function getDataPath(): Promise<string> {
  if (!isElectron() || !window.electronAPI) return ''
  return window.electronAPI.getDataPath()
}

export async function migrateData(newPath: string): Promise<boolean> {
  if (!isElectron() || !window.electronAPI) return false
  return window.electronAPI.migrateData(newPath)
}

export async function setCloseToTray(enabled: boolean): Promise<void> {
  if (!isElectron() || !window.electronAPI) return
  await window.electronAPI.setCloseToTray(enabled)
}

export function onNotificationClicked(callback: (data: { taskId: string; type: string }) => void): void {
  if (!isElectron() || !window.electronAPI) return
  window.electronAPI.onNotificationClicked(callback)
}

export function onNotificationClosed(callback: (data: { taskId: string; type: string }) => void): void {
  if (!isElectron() || !window.electronAPI) return
  window.electronAPI.onNotificationClosed(callback)
}

export function removeNotificationClickedListener(): void {
  if (!isElectron() || !window.electronAPI) return
  window.electronAPI.removeNotificationClickedListener()
}

export function removeNotificationClosedListener(): void {
  if (!isElectron() || !window.electronAPI) return
  window.electronAPI.removeNotificationClosedListener()
}

export async function toggleFloatingWindow(): Promise<void> {
  if (!isElectron() || !window.electronAPI) return
  await window.electronAPI.toggleFloatingWindow()
}

export async function showFloatingWindow(): Promise<void> {
  if (!isElectron() || !window.electronAPI) return
  await window.electronAPI.showFloatingWindow()
}

export async function hideFloatingWindow(): Promise<void> {
  if (!isElectron() || !window.electronAPI) return
  await window.electronAPI.hideFloatingWindow()
}

export async function setFloatingAlwaysOnTop(flag: boolean): Promise<boolean> {
  if (!isElectron() || !window.electronAPI) return false
  const result = await window.electronAPI.setFloatingAlwaysOnTop(flag)
  return result.alwaysOnTop
}

export async function getFloatingAlwaysOnTop(): Promise<boolean> {
  if (!isElectron() || !window.electronAPI) return true
  const result = await window.electronAPI.getFloatingAlwaysOnTop()
  return result.alwaysOnTop
}

export async function notifyDataChanged(data: { type: string; id?: string }): Promise<void> {
  if (!isElectron() || !window.electronAPI) return
  await window.electronAPI.notifyDataChanged(data)
}

export function onDataChanged(callback: (data: { type: string; id?: string }) => void): void {
  if (!isElectron() || !window.electronAPI) return
  window.electronAPI.onDataChanged(callback)
}

export function removeDataChangedListener(): void {
  if (!isElectron() || !window.electronAPI) return
  window.electronAPI.removeDataChangedListener()
}

export async function fetchContent(url: string): Promise<{ success: boolean; data?: { source: string; title: string; content: string; author: string; coverImage?: string; sourceUrl: string }; error?: string }> {
  if (!isElectron() || !window.electronAPI) {
    return { success: false, error: '仅在桌面端可用' }
  }
  return await window.electronAPI.fetchContent(url)
}

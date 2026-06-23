const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  sendNotification: (data) => ipcRenderer.invoke('notification:send', data),
  requestNotificationPermission: () => ipcRenderer.invoke('notification:request-permission'),
  getNotificationPermissionStatus: () => ipcRenderer.invoke('notification:get-permission-status'),
  dismissNotification: (data) => ipcRenderer.invoke('notification:dismiss', data),
  minimizeToTray: () => ipcRenderer.invoke('window:minimize-to-tray'),
  showWindow: () => ipcRenderer.invoke('window:show'),
  selectDataPath: () => ipcRenderer.invoke('dialog:selectDataPath'),
  getDataPath: () => ipcRenderer.invoke('path:getDataPath'),
  migrateData: (newPath) => ipcRenderer.invoke('data:migrate', newPath),
  toggleFloatingWindow: () => ipcRenderer.invoke('floating:toggle'),
  showFloatingWindow: () => ipcRenderer.invoke('floating:show'),
  hideFloatingWindow: () => ipcRenderer.invoke('floating:hide'),
  setFloatingAlwaysOnTop: (flag) => ipcRenderer.invoke('floating:setAlwaysOnTop', flag),
  getFloatingAlwaysOnTop: () => ipcRenderer.invoke('floating:getAlwaysOnTop'),
  notifyDataChanged: (data) => ipcRenderer.invoke('data:changed', data),
  onDataChanged: (callback) => {
    ipcRenderer.on('data:changed', (_event, data) => callback(data))
  },
  removeDataChangedListener: () => {
    ipcRenderer.removeAllListeners('data:changed')
  },
  onNotificationClicked: (callback) => {
    ipcRenderer.on('notification:clicked', (_event, data) => callback(data))
  },
  onNotificationClosed: (callback) => {
    ipcRenderer.on('notification:closed', (_event, data) => callback(data))
  },
  removeNotificationClickedListener: () => {
    ipcRenderer.removeAllListeners('notification:clicked')
  },
  removeNotificationClosedListener: () => {
    ipcRenderer.removeAllListeners('notification:closed')
  },
  fetchContent: (url) => ipcRenderer.invoke('content:fetch', url),
})

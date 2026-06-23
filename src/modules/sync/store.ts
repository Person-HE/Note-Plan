import { create } from 'zustand'
import type { SyncConfig, SyncStatus } from './types'
import { DEFAULT_SYNC_CONFIG } from './types'

// localStorage 存储键
const SYNC_CONFIG_KEY = 'note-plan-sync-config'

/** 持久化同步配置到 localStorage */
function persistSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config))
  } catch {
    console.error('同步配置持久化失败')
  }
}

/** 从 localStorage 加载同步配置 */
function loadSyncConfig(): SyncConfig {
  try {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<SyncConfig>
      return { ...DEFAULT_SYNC_CONFIG, ...parsed }
    }
  } catch {
    console.error('同步配置加载失败')
  }
  return { ...DEFAULT_SYNC_CONFIG }
}

interface SyncState {
  config: SyncConfig
  status: SyncStatus
  isLoaded: boolean

  /** 初始化加载配置 */
  load: () => void
  /** 更新同步配置（部分更新） */
  updateConfig: (updates: Partial<SyncConfig>) => void
  /** 设置同步方式 */
  setSyncMethod: (method: SyncConfig['method']) => void
  /** 设置同步状态 */
  setSyncStatus: (updates: Partial<SyncStatus>) => void
  /** 标记正在同步 */
  setSyncing: (isSyncing: boolean) => void
  /** 设置同步错误 */
  setSyncError: (error: string) => void
  /** 设置上次同步时间 */
  setLastSyncTime: (time: string) => void
  /** 设置同步成功 */
  setSyncSuccess: () => void
  /** 设置同步冲突 */
  setSyncConflict: () => void
  /** 触发同步（由组件调用） */
  triggerSync: () => void
  /** 设置发现的设备数 */
  setDeviceCount: (count: number) => void
}

export const useSyncStore = create<SyncState>((set, get) => ({
  config: { ...DEFAULT_SYNC_CONFIG },
  status: {
    isSyncing: false,
    lastSyncTime: null,
    lastSyncResult: null,
    errorMessage: null,
    deviceCount: 0,
  },
  isLoaded: false,

  load: () => {
    const config = loadSyncConfig()
    set({
      config,
      status: {
        isSyncing: false,
        lastSyncTime: config.lastSyncTime,
        lastSyncResult: null,
        errorMessage: null,
        deviceCount: 0,
      },
      isLoaded: true,
    })
  },

  updateConfig: (updates) => {
    set(state => {
      const newConfig = { ...state.config, ...updates }
      persistSyncConfig(newConfig)
      return { config: newConfig }
    })
  },

  setSyncMethod: (method) => {
    set(state => {
      const newConfig = { ...state.config, method }
      persistSyncConfig(newConfig)
      return { config: newConfig }
    })
  },

  setSyncStatus: (updates) => {
    set(state => ({
      status: { ...state.status, ...updates },
    }))
  },

  setSyncing: (isSyncing) => {
    set(state => ({
      status: {
        ...state.status,
        isSyncing,
        errorMessage: isSyncing ? null : state.status.errorMessage,
      },
    }))
  },

  setSyncError: (error) => {
    set(state => ({
      status: {
        ...state.status,
        isSyncing: false,
        lastSyncResult: 'failed',
        errorMessage: error,
      },
    }))
  },

  setLastSyncTime: (time) => {
    set(state => {
      const newConfig = { ...state.config, lastSyncTime: time }
      persistSyncConfig(newConfig)
      return {
        config: newConfig,
        status: {
          ...state.status,
          lastSyncTime: time,
          isSyncing: false,
          lastSyncResult: 'success',
          errorMessage: null,
        },
      }
    })
  },

  setSyncSuccess: () => {
    const now = new Date().toISOString()
    set(state => {
      const newConfig = { ...state.config, lastSyncTime: now }
      persistSyncConfig(newConfig)
      return {
        config: newConfig,
        status: {
          ...state.status,
          isSyncing: false,
          lastSyncTime: now,
          lastSyncResult: 'success',
          errorMessage: null,
        },
      }
    })
  },

  setSyncConflict: () => {
    set(state => ({
      status: {
        ...state.status,
        isSyncing: false,
        lastSyncResult: 'conflict',
      },
    }))
  },

  triggerSync: () => {
    // 实际同步逻辑由组件调用 services 中的函数
    // 此处仅标记状态
    set(state => ({
      status: { ...state.status, isSyncing: true, errorMessage: null },
    }))
  },

  setDeviceCount: (count) => {
    set(state => ({
      status: { ...state.status, deviceCount: count },
    }))
  },
}))

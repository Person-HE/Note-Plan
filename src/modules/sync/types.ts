// 同步模块类型定义

/** 同步配置 */
export interface SyncConfig {
  enabled: boolean
  method: 'webdav' | 'export_import' | 'lan'
  // WebDAV 配置
  webdavUrl: string
  webdavUsername: string
  webdavPassword: string
  webdavPath: string
  // 局域网配置
  lanDeviceName: string
  lanPort: number
  // 通用配置
  autoSync: boolean
  syncInterval: number // 分钟
  lastSyncTime: string | null
  conflictResolution: 'latest' | 'manual' | 'merge'
}

/** 同步状态 */
export interface SyncStatus {
  isSyncing: boolean
  lastSyncTime: string | null
  lastSyncResult: 'success' | 'failed' | 'conflict' | null
  errorMessage: string | null
  deviceCount: number
}

/** 同步数据载荷 */
export interface SyncPayload {
  version: number
  deviceId: string
  deviceName: string
  exportedAt: string
  data: {
    tasks: any[]
    groups: any[]
    reminders: any[]
    attachments: any[]
    stickyNotes: any[]
    knowledgeBases: any[]
    folders: any[]
    docs: any[]
    docChunks: any[]
    docLinks: any[]
    inspirations: any[]
    inspirationCategories: any[]
    inspirationStickyNotes: any[]
    settings: Record<string, any>
  }
}

/** 局域网设备 */
export interface LANDevice {
  id: string
  name: string
  ip: string
  port: number
  lastSeen: string
}

/** 合并冲突项 */
export interface ConflictItem {
  type: string
  id: string
  local: any
  remote: any
}

/** 合并结果 */
export interface MergeResult {
  merged: SyncPayload
  conflicts: ConflictItem[]
}

/** 默认同步配置 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: false,
  method: 'export_import',
  webdavUrl: '',
  webdavUsername: '',
  webdavPassword: '',
  webdavPath: '/note-plan/',
  lanDeviceName: '',
  lanPort: 9527,
  autoSync: false,
  syncInterval: 30,
  lastSyncTime: null,
  conflictResolution: 'latest',
}

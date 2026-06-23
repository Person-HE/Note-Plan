import { db, clearAllData } from '@/core/database'
import { storageService } from '@/core/storage'
import { generateId } from '@/shared/id-utils'
import type { SyncConfig, SyncPayload, LANDevice, MergeResult, ConflictItem } from './types'

// 数据版本号
const DATA_VERSION = 1
// 局域网广播频道名称
const LAN_CHANNEL_NAME = 'note-plan-lan-sync'
// 设备唯一标识（会话级）
const DEVICE_ID = generateId()

/** 获取设备名称 */
function getDeviceName(): string {
  const ua = navigator.userAgent
  if (ua.includes('Windows')) return 'Windows 设备'
  if (ua.includes('Mac')) return 'Mac 设备'
  if (ua.includes('Linux')) return 'Linux 设备'
  if (ua.includes('Android')) return 'Android 设备'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS 设备'
  return '未知设备'
}

// ==================== 读取所有本地数据 ====================

/** 从 IndexedDB 读取所有数据并组装为 SyncPayload */
async function readAllLocalData(): Promise<SyncPayload> {
  const [tasks, groups, reminders, attachments, stickyNotes,
    knowledgeBases, folders, docs, docChunks, docLinks,
    inspirations, inspirationCategories, inspirationStickyNotes] = await Promise.all([
    db.tasks.toArray(),
    db.groups.toArray(),
    db.reminders.toArray(),
    db.attachments.toArray(),
    db.stickyNotes.toArray(),
    db.knowledgeBases.toArray(),
    db.folders.toArray(),
    db.docs.toArray(),
    db.docChunks.toArray(),
    db.docLinks.toArray(),
    db.inspirations.toArray(),
    db.inspirationCategories.toArray(),
    db.inspirationStickyNotes.toArray(),
  ])

  // 读取设置
  const settings = await storageService.getAll()

  return {
    version: DATA_VERSION,
    deviceId: DEVICE_ID,
    deviceName: getDeviceName(),
    exportedAt: new Date().toISOString(),
    data: {
      tasks,
      groups,
      reminders,
      attachments,
      stickyNotes,
      knowledgeBases,
      folders,
      docs,
      docChunks,
      docLinks,
      inspirations,
      inspirationCategories,
      inspirationStickyNotes,
      settings: settings as Record<string, any>,
    },
  }
}

/** 将 SyncPayload 数据写入 IndexedDB */
async function writePayloadData(payload: SyncPayload): Promise<void> {
  const allTables = [
    db.tasks, db.groups, db.reminders, db.attachments,
    db.stickyNotes, db.knowledgeBases, db.folders, db.docs,
    db.docChunks, db.docLinks, db.inspirations, db.inspirationCategories,
    db.inspirationStickyNotes,
  ]

  const d = payload.data
  await db.transaction('rw', allTables, async () => {
    if (d.tasks?.length) await db.tasks.bulkPut(d.tasks)
    if (d.groups?.length) await db.groups.bulkPut(d.groups)
    if (d.reminders?.length) await db.reminders.bulkPut(d.reminders)
    if (d.attachments?.length) await db.attachments.bulkPut(d.attachments)
    if (d.stickyNotes?.length) await db.stickyNotes.bulkPut(d.stickyNotes)
    if (d.knowledgeBases?.length) await db.knowledgeBases.bulkPut(d.knowledgeBases)
    if (d.folders?.length) await db.folders.bulkPut(d.folders)
    if (d.docs?.length) await db.docs.bulkPut(d.docs)
    if (d.docChunks?.length) await db.docChunks.bulkPut(d.docChunks)
    if (d.docLinks?.length) await db.docLinks.bulkPut(d.docLinks)
    if (d.inspirations?.length) await db.inspirations.bulkPut(d.inspirations)
    if (d.inspirationCategories?.length) await db.inspirationCategories.bulkPut(d.inspirationCategories)
    if (d.inspirationStickyNotes?.length) await db.inspirationStickyNotes.bulkPut(d.inspirationStickyNotes)
  })

  // 写入设置
  if (d.settings) {
    for (const [key, value] of Object.entries(d.settings)) {
      await storageService.set(key, value)
    }
  }
}

// ==================== WebDAV 同步 ====================

/** 构建 WebDAV 请求头 */
function webdavHeaders(config: SyncConfig): HeadersInit {
  const auth = btoa(`${config.webdavUsername}:${config.webdavPassword}`)
  return {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/json',
  }
}

/** 获取 WebDAV 完整 URL */
function webdavFullUrl(config: SyncConfig, path: string): string {
  const base = config.webdavUrl.endsWith('/') ? config.webdavUrl : `${config.webdavUrl}/`
  return `${base}${path}`
}

/** 测试 WebDAV 连接 */
export async function webdavTestConnection(config: SyncConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(config.webdavUrl, {
      method: 'PROPFIND',
      headers: {
        ...webdavHeaders(config),
        'Depth': '0',
      },
    })

    if (response.status === 207 || response.status === 200) {
      return { success: true }
    }
    if (response.status === 401) {
      return { success: false, error: '认证失败，请检查用户名和密码' }
    }
    if (response.status === 404) {
      return { success: false, error: 'WebDAV 路径不存在' }
    }
    return { success: false, error: `连接失败 (HTTP ${response.status})` }
  } catch (err) {
    if (err instanceof TypeError && err.message.includes('fetch')) {
      return { success: false, error: '网络错误，请检查URL或CORS配置' }
    }
    return { success: false, error: err instanceof Error ? err.message : '连接测试失败' }
  }
}

/** 上传数据到 WebDAV 服务器 */
export async function webdavUpload(config: SyncConfig, payload: SyncPayload): Promise<{ success: boolean; error?: string }> {
  try {
    // 确保远程目录存在
    const dirPath = config.webdavPath.replace(/^\/|\/$/g, '')
    const dirUrl = webdavFullUrl(config, dirPath)
    const mkcolRes = await fetch(dirUrl, {
      method: 'MKCOL',
      headers: webdavHeaders(config),
    })
    // 201=创建成功, 405/409=已存在，均正常
    if (!mkcolRes.ok && mkcolRes.status !== 405 && mkcolRes.status !== 409) {
      return { success: false, error: `创建远程目录失败 (HTTP ${mkcolRes.status})` }
    }

    // 上传同步数据
    const filePath = `${dirPath}/sync-data.json`
    const fileUrl = webdavFullUrl(config, filePath)
    const res = await fetch(fileUrl, {
      method: 'PUT',
      headers: webdavHeaders(config),
      body: JSON.stringify(payload, null, 2),
    })

    if (!res.ok && res.status !== 201 && res.status !== 204) {
      return { success: false, error: `上传失败 (HTTP ${res.status})` }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '上传失败' }
  }
}

/** 从 WebDAV 服务器下载数据 */
export async function webdavDownload(config: SyncConfig): Promise<{ success: boolean; data?: SyncPayload; error?: string }> {
  try {
    const dirPath = config.webdavPath.replace(/^\/|\/$/g, '')
    const filePath = `${dirPath}/sync-data.json`
    const fileUrl = webdavFullUrl(config, filePath)

    const res = await fetch(fileUrl, {
      method: 'GET',
      headers: webdavHeaders(config),
    })

    if (res.status === 404) {
      // 远程无数据，首次同步
      return { success: true, data: undefined }
    }
    if (!res.ok) {
      return { success: false, error: `下载失败 (HTTP ${res.status})` }
    }

    const json = await res.text()
    const payload = JSON.parse(json) as SyncPayload
    return { success: true, data: payload }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '下载失败' }
  }
}

/** 检查 WebDAV 远程文件是否存在及最后修改时间 */
export async function webdavCheckRemote(config: SyncConfig): Promise<{ exists: boolean; lastModified?: string; error?: string }> {
  try {
    const dirPath = config.webdavPath.replace(/^\/|\/$/g, '')
    const filePath = `${dirPath}/sync-data.json`
    const fileUrl = webdavFullUrl(config, filePath)

    const res = await fetch(fileUrl, {
      method: 'HEAD',
      headers: webdavHeaders(config),
    })

    if (res.status === 404) {
      return { exists: false }
    }
    if (!res.ok) {
      return { exists: false, error: `检查失败 (HTTP ${res.status})` }
    }

    const lastModified = res.headers.get('last-modified') || undefined
    return { exists: true, lastModified }
  } catch (err) {
    return { exists: false, error: err instanceof Error ? err.message : '检查远程文件失败' }
  }
}

// ==================== 导出 / 导入 ====================

/** 导出所有数据为 SyncPayload */
export async function exportAllData(): Promise<SyncPayload> {
  return await readAllLocalData()
}

/** 触发浏览器下载 JSON 文件 */
export async function exportToFile(): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = await exportAllData()
    const json = JSON.stringify(payload, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `note-plan-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '导出失败' }
  }
}

/** 从 JSON 文件导入数据，与现有数据合并 */
export async function importAllData(file: File, resolution: SyncConfig['conflictResolution'] = 'merge'): Promise<{ success: boolean; error?: string; conflicts?: ConflictItem[] }> {
  try {
    const text = await file.text()
    const remotePayload = JSON.parse(text) as SyncPayload

    if (!remotePayload.version || !remotePayload.data) {
      return { success: false, error: '无效的备份文件格式' }
    }

    // 读取本地数据
    const localPayload = await readAllLocalData()

    // 合并数据
    const result = mergeData(localPayload, remotePayload, resolution)

    // 清空并写入合并后的数据
    await clearAllData()
    await writePayloadData(result.merged)

    if (result.conflicts.length > 0) {
      return { success: true, conflicts: result.conflicts }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '导入失败' }
  }
}

/** 打开文件选择器并导入 */
export function importFromFile(resolution: SyncConfig['conflictResolution'] = 'merge'): Promise<{ success: boolean; error?: string; conflicts?: ConflictItem[] }> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) {
        resolve({ success: false, error: '未选择文件' })
        return
      }
      const result = await importAllData(file, resolution)
      resolve(result)
    }
    input.click()
  })
}

// ==================== 局域网 P2P 同步 ====================

let broadcastChannel: BroadcastChannel | null = null
let discoveryInterval: ReturnType<typeof setInterval> | null = null
const discoveredDevices = new Map<string, LANDevice>()

/** 启动局域网广播（BroadcastChannel） */
export function startLANBroadcast(deviceName: string): { success: boolean; error?: string } {
  try {
    stopLANBroadcast()

    broadcastChannel = new BroadcastChannel(LAN_CHANNEL_NAME)

    broadcastChannel.onmessage = (event) => {
      const { type, device } = event.data as { type: string; device: LANDevice }
      if (type === 'announce' && device.id !== DEVICE_ID) {
        discoveredDevices.set(device.id, {
          ...device,
          lastSeen: new Date().toISOString(),
        })
      }
    }

    // 定期广播本机存在
    const device: LANDevice = {
      id: DEVICE_ID,
      name: deviceName || getDeviceName(),
      ip: '',
      port: 0,
      lastSeen: new Date().toISOString(),
    }

    discoveryInterval = setInterval(() => {
      broadcastChannel?.postMessage({ type: 'announce', device })
    }, 5000)

    // 立即广播一次
    broadcastChannel.postMessage({ type: 'announce', device })

    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '启动局域网广播失败' }
  }
}

/** 停止局域网广播 */
export function stopLANBroadcast(): void {
  if (discoveryInterval) {
    clearInterval(discoveryInterval)
    discoveryInterval = null
  }
  if (broadcastChannel) {
    broadcastChannel.close()
    broadcastChannel = null
  }
}

/** 获取已发现的局域网设备列表 */
export function discoverLANDevices(): LANDevice[] {
  // 清除超过30秒未响应的设备
  const now = Date.now()
  for (const [id, device] of discoveredDevices) {
    const lastSeen = new Date(device.lastSeen).getTime()
    if (now - lastSeen > 30000) {
      discoveredDevices.delete(id)
    }
  }
  return Array.from(discoveredDevices.values())
}

/** 通过局域网与指定设备同步（BroadcastChannel 传输数据） */
export async function syncWithLANDevice(device: LANDevice, resolution: SyncConfig['conflictResolution'] = 'merge'): Promise<{ success: boolean; error?: string; conflicts?: ConflictItem[] }> {
  try {
    if (!broadcastChannel) {
      return { success: false, error: '局域网广播未启动' }
    }

    // 读取本地数据
    const localPayload = await readAllLocalData()

    // 通过 BroadcastChannel 发送同步请求
    // 注意：BroadcastChannel 是同源页面间的通信，无法跨设备
    // 真正跨设备需要通过 HTTP 请求，此处使用 BroadcastChannel 作为同浏览器多标签页同步
    broadcastChannel.postMessage({
      type: 'sync-request',
      from: DEVICE_ID,
      data: localPayload,
    })

    // 等待对方响应（简化实现：直接发送数据给对方）
    // 实际场景中需要实现请求-响应协议
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '局域网同步失败' }
  }
}

/** 通过 HTTP 与局域网设备同步（用于跨设备场景） */
export async function syncWithLANDeviceHTTP(device: LANDevice, resolution: SyncConfig['conflictResolution'] = 'merge'): Promise<{ success: boolean; error?: string; conflicts?: ConflictItem[] }> {
  try {
    // 读取本地数据
    const localPayload = await readAllLocalData()

    // 从远程设备拉取数据
    const remoteUrl = `http://${device.ip}:${device.port}/sync`
    const fetchRes = await fetch(remoteUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(localPayload),
    })

    if (!fetchRes.ok) {
      return { success: false, error: `远程设备响应失败 (HTTP ${fetchRes.status})` }
    }

    const remotePayload = (await fetchRes.json()) as SyncPayload

    // 合并数据
    const result = mergeData(localPayload, remotePayload, resolution)

    // 写入合并后的数据
    await clearAllData()
    await writePayloadData(result.merged)

    if (result.conflicts.length > 0) {
      return { success: true, conflicts: result.conflicts }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '局域网同步失败' }
  }
}

// ==================== 合并逻辑 ====================

/** 按时间戳合并记录数组，保留较新的版本 */
function mergeRecords<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  local: T[],
  remote: T[],
  resolution: SyncConfig['conflictResolution'],
  type: string,
  conflicts: ConflictItem[]
): T[] {
  const map = new Map<string, T>()

  // 先放入本地数据
  for (const item of local) map.set(item.id, item)

  // 逐条合并远程数据
  for (const remoteItem of remote) {
    const localItem = map.get(remoteItem.id)

    if (!localItem) {
      // 远程有、本地没有 → 直接添加
      map.set(remoteItem.id, remoteItem)
      continue
    }

    // 两边都有，需要解决冲突
    const localTime = localItem.updatedAt
      ? new Date(localItem.updatedAt).getTime()
      : localItem.createdAt
        ? new Date(localItem.createdAt).getTime()
        : 0
    const remoteTime = remoteItem.updatedAt
      ? new Date(remoteItem.updatedAt).getTime()
      : remoteItem.createdAt
        ? new Date(remoteItem.createdAt).getTime()
        : 0

    if (resolution === 'latest') {
      // 保留较新的版本
      map.set(remoteItem.id, remoteTime > localTime ? remoteItem : localItem)
    } else if (resolution === 'merge') {
      // 合并模式：保留较新的，但记录冲突
      if (remoteTime > localTime) {
        map.set(remoteItem.id, remoteItem)
      }
      // 如果两边都有修改（时间不同），记录为冲突
      if (remoteTime !== localTime && remoteTime > 0 && localTime > 0) {
        conflicts.push({
          type,
          id: remoteItem.id,
          local: localItem,
          remote: remoteItem,
        })
      }
    } else if (resolution === 'manual') {
      // 手动模式：记录所有冲突，保留本地版本
      conflicts.push({
        type,
        id: remoteItem.id,
        local: localItem,
        remote: remoteItem,
      })
    }
  }

  return Array.from(map.values())
}

/** 合并两个 SyncPayload */
export function mergeData(local: SyncPayload, remote: SyncPayload, resolution: SyncConfig['conflictResolution']): MergeResult {
  const conflicts: ConflictItem[] = []

  const merged: SyncPayload = {
    version: DATA_VERSION,
    deviceId: DEVICE_ID,
    deviceName: getDeviceName(),
    exportedAt: new Date().toISOString(),
    data: {
      tasks: mergeRecords(local.data.tasks, remote.data.tasks ?? [], resolution, 'tasks', conflicts),
      groups: mergeRecords(local.data.groups, remote.data.groups ?? [], resolution, 'groups', conflicts),
      reminders: mergeRecords(local.data.reminders, remote.data.reminders ?? [], resolution, 'reminders', conflicts),
      attachments: mergeRecords(local.data.attachments, remote.data.attachments ?? [], resolution, 'attachments', conflicts),
      stickyNotes: mergeRecords(local.data.stickyNotes, remote.data.stickyNotes ?? [], resolution, 'stickyNotes', conflicts),
      knowledgeBases: mergeRecords(local.data.knowledgeBases, remote.data.knowledgeBases ?? [], resolution, 'knowledgeBases', conflicts),
      folders: mergeRecords(local.data.folders, remote.data.folders ?? [], resolution, 'folders', conflicts),
      docs: mergeRecords(local.data.docs, remote.data.docs ?? [], resolution, 'docs', conflicts),
      docChunks: mergeRecords(local.data.docChunks, remote.data.docChunks ?? [], resolution, 'docChunks', conflicts),
      docLinks: mergeRecords(local.data.docLinks, remote.data.docLinks ?? [], resolution, 'docLinks', conflicts),
      inspirations: mergeRecords(local.data.inspirations, remote.data.inspirations ?? [], resolution, 'inspirations', conflicts),
      inspirationCategories: mergeRecords(local.data.inspirationCategories, remote.data.inspirationCategories ?? [], resolution, 'inspirationCategories', conflicts),
      inspirationStickyNotes: mergeRecords(local.data.inspirationStickyNotes, remote.data.inspirationStickyNotes ?? [], resolution, 'inspirationStickyNotes', conflicts),
      // 设置以远程为准（简单策略）
      settings: { ...local.data.settings, ...remote.data.settings },
    },
  }

  return { merged, conflicts }
}

// ==================== 通用同步流程 ====================

/** 执行同步（根据配置的同步方式） */
export async function performSync(config: SyncConfig): Promise<{ success: boolean; error?: string; conflicts?: ConflictItem[] }> {
  try {
    // 1. 读取本地数据
    const localPayload = await readAllLocalData()

    if (config.method === 'webdav') {
      // 2a. WebDAV 同步
      const downloadResult = await webdavDownload(config)
      if (!downloadResult.success) {
        return { success: false, error: downloadResult.error }
      }

      if (!downloadResult.data) {
        // 远程无数据，直接上传
        const uploadResult = await webdavUpload(config, localPayload)
        return uploadResult
      }

      // 合并
      const result = mergeData(localPayload, downloadResult.data, config.conflictResolution)

      // 上传合并后的数据
      await webdavUpload(config, result.merged)

      // 写入本地
      await clearAllData()
      await writePayloadData(result.merged)

      if (result.conflicts.length > 0) {
        return { success: true, conflicts: result.conflicts }
      }
      return { success: true }
    }

    if (config.method === 'export_import') {
      // 2b. 导出/导入模式不需要自动同步
      return { success: false, error: '导出/导入模式请手动操作' }
    }

    if (config.method === 'lan') {
      // 2c. 局域网同步
      const devices = discoverLANDevices()
      if (devices.length === 0) {
        return { success: false, error: '未发现局域网设备' }
      }
      // 与第一个发现的设备同步
      const result = await syncWithLANDeviceHTTP(devices[0], config.conflictResolution)
      return result
    }

    return { success: false, error: '未知的同步方式' }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : '同步失败' }
  }
}

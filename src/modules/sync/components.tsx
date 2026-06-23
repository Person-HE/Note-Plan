import { useState, useEffect, useRef } from 'react'
import {
  RefreshCw, Download, Upload, Wifi, Globe, HardDrive,
  CheckCircle2, AlertTriangle, Monitor, Radio, Clock,
  Shield, Settings2, ChevronRight
} from 'lucide-react'
import { useSyncStore } from './store'
import {
  exportToFile, importFromFile, importAllData,
  webdavTestConnection, webdavCheckRemote, performSync,
  startLANBroadcast, stopLANBroadcast, discoverLANDevices,
  syncWithLANDevice
} from './services'
import type { LANDevice, ConflictItem } from './types'
import { Button, Input, Select, Checkbox } from '@/shared/components'

// 同步方式配置
const METHOD_OPTIONS = [
  { label: '导出/导入', value: 'export_import' },
  { label: 'WebDAV', value: 'webdav' },
  { label: '局域网', value: 'lan' },
] as const

const METHOD_INFO: Record<string, { icon: React.ReactNode; desc: string }> = {
  export_import: { icon: <HardDrive size={16} />, desc: '手动导出和导入 JSON 备份文件' },
  webdav: { icon: <Globe size={16} />, desc: '通过 WebDAV 服务自动同步' },
  lan: { icon: <Wifi size={16} />, desc: '同一网络下的设备间同步' },
}

const CONFLICT_OPTIONS = [
  { label: '保留最新', value: 'latest' },
  { label: '合并', value: 'merge' },
  { label: '手动解决', value: 'manual' },
] as const

// ==================== WebDAV 配置面板 ====================

export function WebDAVConfig() {
  const config = useSyncStore(s => s.config)
  const updateConfig = useSyncStore(s => s.updateConfig)
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [remoteInfo, setRemoteInfo] = useState<{ exists: boolean; lastModified?: string } | null>(null)

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    const result = await webdavTestConnection(config)
    setTestResult(result)

    // 同时检查远程文件
    if (result.success) {
      const remote = await webdavCheckRemote(config)
      setRemoteInfo({ exists: remote.exists, lastModified: remote.lastModified })
    }
    setIsTesting(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
        <Globe size={16} />
        WebDAV 配置
      </div>

      <div className="space-y-3 pl-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>服务器地址</span>
          <Input
            value={config.webdavUrl}
            onChange={(e) => updateConfig({ webdavUrl: e.target.value })}
            placeholder="https://dav.example.com/"
            className="w-64"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>用户名</span>
          <Input
            value={config.webdavUsername}
            onChange={(e) => updateConfig({ webdavUsername: e.target.value })}
            placeholder="用户名"
            className="w-64"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>密码</span>
          <Input
            type="password"
            value={config.webdavPassword}
            onChange={(e) => updateConfig({ webdavPassword: e.target.value })}
            placeholder="密码"
            className="w-64"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>远程路径</span>
          <Input
            value={config.webdavPath}
            onChange={(e) => updateConfig({ webdavPath: e.target.value })}
            placeholder="/note-plan/"
            className="w-64"
          />
        </div>

        {/* 测试连接 */}
        <div className="flex items-center gap-3">
          <Button onClick={handleTest} disabled={isTesting || !config.webdavUrl} size="sm">
            {isTesting ? '测试中...' : '测试连接'}
          </Button>
          {testResult && (
            <span className="text-xs font-hand flex items-center gap-1" style={{
              color: testResult.success ? 'var(--accent-green, #22c55e)' : 'var(--accent-red, #ef4444)'
            }}>
              {testResult.success
                ? <><CheckCircle2 size={12} /> 连接成功</>
                : <><AlertTriangle size={12} /> {testResult.error}</>
              }
            </span>
          )}
        </div>

        {/* 远程文件信息 */}
        {remoteInfo && remoteInfo.exists && (
          <div className="text-xs font-hand flex items-center gap-1" style={{ color: 'var(--ink-light)' }}>
            <Clock size={12} />
            远程文件最后修改：{remoteInfo.lastModified
              ? new Date(remoteInfo.lastModified).toLocaleString('zh-CN')
              : '未知'
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== 导出/导入面板 ====================

export function ExportImportPanel() {
  const config = useSyncStore(s => s.config)
  const updateConfig = useSyncStore(s => s.updateConfig)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; error?: string; conflicts?: ConflictItem[] } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleExport = async () => {
    setIsExporting(true)
    const result = await exportToFile()
    if (!result.success) {
      alert(result.error || '导出失败')
    }
    setIsExporting(false)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsImporting(true)
    setImportResult(null)
    const result = await importAllData(file, config.conflictResolution)
    setImportResult(result)

    if (result.success) {
      alert('导入成功！请刷新页面以加载新数据。')
    } else {
      alert(result.error || '导入失败')
    }
    setIsImporting(false)
    // 重置文件输入
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleImportFromFile = async () => {
    setIsImporting(true)
    setImportResult(null)
    const result = await importFromFile(config.conflictResolution)
    setImportResult(result)
    if (result.success) {
      alert('导入成功！请刷新页面以加载新数据。')
    } else if (result.error !== '未选择文件') {
      alert(result.error || '导入失败')
    }
    setIsImporting(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
        <Download size={16} />
        导出 / 导入
      </div>

      <div className="space-y-3 pl-6">
        <div className="flex items-center gap-3">
          <Button onClick={handleExport} disabled={isExporting} size="sm">
            <Download size={14} /> {isExporting ? '导出中...' : '导出备份'}
          </Button>
          <Button onClick={handleImportFromFile} disabled={isImporting} variant="secondary" size="sm">
            <Upload size={14} /> {isImporting ? '导入中...' : '导入备份'}
          </Button>
        </div>

        {/* 也可以通过文件选择器导入 */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="text-sm font-hand"
            style={{ color: 'var(--ink-light)' }}
            onChange={handleImport}
          />
        </div>

        {/* 冲突解决策略 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>冲突解决策略</span>
          <Select
            value={config.conflictResolution}
            onChange={(v) => updateConfig({ conflictResolution: v as any })}
            options={[...CONFLICT_OPTIONS]}
          />
        </div>

        {/* 导入结果 */}
        {importResult?.conflicts && importResult.conflicts.length > 0 && (
          <div className="text-xs font-hand p-2 rounded" style={{
            background: 'var(--watercolor-yellow)',
            color: 'var(--ink-black)',
            border: 'var(--border-sketch)',
          }}>
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle size={12} />
              发现 {importResult.conflicts.length} 个冲突
            </div>
            {importResult.conflicts.slice(0, 5).map((c, i) => (
              <div key={i} style={{ color: 'var(--ink-gray)' }}>
                {c.type} - {c.id}
              </div>
            ))}
            {importResult.conflicts.length > 5 && (
              <div style={{ color: 'var(--ink-light)' }}>
                ...还有 {importResult.conflicts.length - 5} 个冲突
              </div>
            )}
          </div>
        )}

        {/* 上次导出时间 */}
        {config.lastSyncTime && (
          <div className="text-xs font-hand flex items-center gap-1" style={{ color: 'var(--ink-light)' }}>
            <Clock size={12} />
            上次操作：{new Date(config.lastSyncTime).toLocaleString('zh-CN')}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== 局域网同步面板 ====================

export function LANSyncPanel() {
  const config = useSyncStore(s => s.config)
  const updateConfig = useSyncStore(s => s.updateConfig)
  const setDeviceCount = useSyncStore(s => s.setDeviceCount)
  const [isBroadcasting, setIsBroadcasting] = useState(false)
  const [devices, setDevices] = useState<LANDevice[]>([])
  const [syncingDeviceId, setSyncingDeviceId] = useState<string | null>(null)

  // 定时刷新设备列表
  useEffect(() => {
    if (!isBroadcasting) return
    const interval = setInterval(() => {
      const list = discoverLANDevices()
      setDevices(list)
      setDeviceCount(list.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [isBroadcasting, setDeviceCount])

  const handleStartBroadcast = () => {
    const result = startLANBroadcast(config.lanDeviceName)
    if (result.success) {
      setIsBroadcasting(true)
    } else {
      alert(result.error || '启动局域网发现失败')
    }
  }

  const handleStopBroadcast = () => {
    stopLANBroadcast()
    setIsBroadcasting(false)
    setDevices([])
    setDeviceCount(0)
  }

  const handleSyncWithDevice = async (device: LANDevice) => {
    setSyncingDeviceId(device.id)
    const result = await syncWithLANDevice(device, config.conflictResolution)
    if (result.success) {
      alert('同步成功！')
    } else {
      alert(result.error || '同步失败')
    }
    setSyncingDeviceId(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
        <Wifi size={16} />
        局域网同步
      </div>

      <div className="space-y-3 pl-6">
        {/* 设备名称 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>设备名称</span>
          <Input
            value={config.lanDeviceName}
            onChange={(e) => updateConfig({ lanDeviceName: e.target.value })}
            placeholder="我的设备"
            className="w-64"
          />
        </div>

        {/* 端口号 */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>端口号</span>
          <Input
            type="number"
            value={config.lanPort}
            onChange={(e) => updateConfig({ lanPort: parseInt(e.target.value) || 9527 })}
            className="w-64"
          />
        </div>

        {/* 广播控制 */}
        <div className="flex items-center gap-3">
          <Button
            onClick={isBroadcasting ? handleStopBroadcast : handleStartBroadcast}
            variant={isBroadcasting ? 'danger' : 'primary'}
            size="sm"
          >
            <Radio size={14} />
            {isBroadcasting ? '停止广播' : '启动广播'}
          </Button>
          {isBroadcasting && (
            <span className="text-xs font-hand flex items-center gap-1" style={{ color: 'var(--accent-green, #22c55e)' }}>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: 'var(--accent-green, #22c55e)' }} />
              广播中
            </span>
          )}
        </div>

        {/* 已发现设备列表 */}
        {isBroadcasting && (
          <div className="space-y-2">
            <div className="text-xs font-hand font-medium" style={{ color: 'var(--ink-gray)' }}>
              发现的设备 ({devices.length})
            </div>

            {devices.length === 0 ? (
              <div className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>
                正在搜索附近设备...
              </div>
            ) : (
              <div className="space-y-1">
                {devices.map(device => (
                  <div
                    key={device.id}
                    className="flex items-center justify-between p-2 rounded"
                    style={{
                      background: 'var(--paper-bg)',
                      border: 'var(--border-sketch)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Monitor size={14} style={{ color: 'var(--ink-gray)' }} />
                      <div>
                        <div className="text-sm font-hand" style={{ color: 'var(--ink-black)' }}>
                          {device.name}
                        </div>
                        <div className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>
                          {device.ip || '同浏览器标签页'}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={syncingDeviceId === device.id}
                      onClick={() => handleSyncWithDevice(device)}
                    >
                      <RefreshCw size={12} className={syncingDeviceId === device.id ? 'animate-spin' : ''} />
                      {syncingDeviceId === device.id ? '同步中' : '同步'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 使用说明 */}
        <div className="text-xs font-hand p-2 rounded" style={{
          background: 'var(--watercolor-blue)',
          color: 'var(--accent-blue)',
          border: '1px solid var(--accent-blue)',
        }}>
          <div className="flex items-center gap-1 mb-1 font-medium">
            <AlertTriangle size={12} />
            使用说明
          </div>
          <ul className="space-y-0.5 pl-4 list-disc">
            <li>局域网同步基于 BroadcastChannel，适用于同一浏览器的多个标签页</li>
            <li>跨设备同步需要设备在同一网络下，并输入对方 IP 地址</li>
            <li>首次使用请先启动广播，等待发现其他设备</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

// ==================== 主同步面板 ====================

export function SyncPanel() {
  const store = useSyncStore()
  const config = useSyncStore(s => s.config)
  const status = useSyncStore(s => s.status)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ success: boolean; error?: string; conflicts?: ConflictItem[] } | null>(null)

  // 初始化加载
  useEffect(() => {
    if (!useSyncStore.getState().isLoaded) {
      store.load()
    }
  }, [])

  // 自动同步定时器
  useEffect(() => {
    if (!config.enabled || !config.autoSync || config.method === 'export_import') return

    const intervalMs = config.syncInterval * 60 * 1000
    const timer = setInterval(async () => {
      if (useSyncStore.getState().status.isSyncing) return
      store.triggerSync()
      const result = await performSync(config)
      if (result.success) {
        store.setSyncSuccess()
      } else {
        store.setSyncError(result.error || '同步失败')
      }
    }, intervalMs)

    return () => clearInterval(timer)
  }, [config.enabled, config.autoSync, config.method, config.syncInterval])

  // 手动同步
  const handleSyncNow = async () => {
    setIsSyncing(true)
    setSyncResult(null)
    store.triggerSync()

    const result = await performSync(config)
    setSyncResult(result)

    if (result.success) {
      store.setSyncSuccess()
    } else {
      store.setSyncError(result.error || '同步失败')
    }
    setIsSyncing(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-hand" style={{ color: 'var(--ink-black)' }}>
          数据同步
        </h2>
        <div className="flex items-center gap-2">
          {status.isSyncing && (
            <span className="text-xs font-hand flex items-center gap-1" style={{ color: 'var(--accent-orange)' }}>
              <RefreshCw size={12} className="animate-spin" />
              同步中...
            </span>
          )}
        </div>
      </div>

      {/* 同步方式选择 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
          <Settings2 size={16} />
          同步设置
        </div>
        <div className="space-y-3 pl-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>同步方式</span>
            <Select
              value={config.method}
              onChange={(v) => store.setSyncMethod(v as any)}
              options={[...METHOD_OPTIONS]}
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-hand" style={{ color: 'var(--ink-light)' }}>
            {METHOD_INFO[config.method]?.icon}
            {METHOD_INFO[config.method]?.desc}
          </div>

          {/* 启用同步 */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>启用同步</span>
            <Checkbox
              checked={config.enabled}
              onChange={(v) => store.updateConfig({ enabled: v })}
            />
          </div>

          {/* 自动同步 */}
          {config.enabled && config.method !== 'export_import' && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>自动同步</span>
                <Checkbox
                  checked={config.autoSync}
                  onChange={(v) => store.updateConfig({ autoSync: v })}
                />
              </div>
              {config.autoSync && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>同步间隔（分钟）</span>
                  <Input
                    type="number"
                    value={config.syncInterval}
                    onChange={(e) => store.updateConfig({ syncInterval: parseInt(e.target.value) || 30 })}
                    className="w-24"
                    min={5}
                  />
                </div>
              )}
            </>
          )}

          {/* 冲突解决策略（非导出导入模式） */}
          {config.method !== 'export_import' && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>冲突解决策略</span>
              <Select
                value={config.conflictResolution}
                onChange={(v) => store.updateConfig({ conflictResolution: v as any })}
                options={[...CONFLICT_OPTIONS]}
              />
            </div>
          )}
        </div>
      </section>

      {/* 根据同步方式显示对应配置面板 */}
      {config.method === 'export_import' && <ExportImportPanel />}
      {config.method === 'webdav' && <WebDAVConfig />}
      {config.method === 'lan' && <LANSyncPanel />}

      {/* 立即同步按钮（非导出导入模式） */}
      {config.method !== 'export_import' && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSyncNow}
              disabled={isSyncing || !config.enabled}
              size="md"
            >
              <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
              {isSyncing ? '同步中...' : '立即同步'}
            </Button>
            {syncResult && (
              <span className="text-xs font-hand flex items-center gap-1" style={{
                color: syncResult.success ? 'var(--accent-green, #22c55e)' : 'var(--accent-red, #ef4444)'
              }}>
                {syncResult.success
                  ? <><CheckCircle2 size={12} /> 同步成功</>
                  : <><AlertTriangle size={12} /> {syncResult.error}</>
                }
              </span>
            )}
          </div>

          {/* 同步冲突提示 */}
          {syncResult?.conflicts && syncResult.conflicts.length > 0 && (
            <div className="text-xs font-hand p-3 rounded" style={{
              background: 'var(--watercolor-yellow)',
              color: 'var(--ink-black)',
              border: 'var(--border-sketch)',
            }}>
              <div className="flex items-center gap-1 mb-2 font-medium">
                <AlertTriangle size={14} />
                发现 {syncResult.conflicts.length} 个数据冲突
              </div>
              {syncResult.conflicts.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-2 py-0.5" style={{ color: 'var(--ink-gray)' }}>
                  <ChevronRight size={10} />
                  <span>[{c.type}] {c.id}</span>
                </div>
              ))}
              {syncResult.conflicts.length > 5 && (
                <div className="mt-1" style={{ color: 'var(--ink-light)' }}>
                  ...还有 {syncResult.conflicts.length - 5} 个冲突
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* 同步状态 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
          <Shield size={16} />
          同步状态
        </div>
        <div className="space-y-2 pl-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>上次同步</span>
            <span className="text-xs font-hand" style={{ color: 'var(--ink-gray)' }}>
              {status.lastSyncTime
                ? new Date(status.lastSyncTime).toLocaleString('zh-CN')
                : '尚未同步'
              }
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>同步结果</span>
            <span className="text-xs font-hand flex items-center gap-1" style={{
              color: status.lastSyncResult === 'success'
                ? 'var(--accent-green, #22c55e)'
                : status.lastSyncResult === 'failed'
                  ? 'var(--accent-red, #ef4444)'
                  : status.lastSyncResult === 'conflict'
                    ? 'var(--accent-orange)'
                    : 'var(--ink-light)'
            }}>
              {status.lastSyncResult === 'success' && <><CheckCircle2 size={12} /> 成功</>}
              {status.lastSyncResult === 'failed' && <><AlertTriangle size={12} /> 失败</>}
              {status.lastSyncResult === 'conflict' && <><AlertTriangle size={12} /> 有冲突</>}
              {!status.lastSyncResult && '无'}
            </span>
          </div>
          {status.errorMessage && (
            <div className="text-xs font-hand flex items-center gap-1" style={{ color: 'var(--accent-red, #ef4444)' }}>
              <AlertTriangle size={12} /> {status.errorMessage}
            </div>
          )}
          {config.method === 'lan' && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>发现设备数</span>
              <span className="text-xs font-hand" style={{ color: 'var(--ink-gray)' }}>
                {status.deviceCount}
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

import React, { useState, useEffect } from 'react'
import {
  Sun, Moon, Monitor, Rocket, Keyboard,
  Bell, BellOff, Target, RotateCcw, Shield, Minimize2, Layout, Folder,
  LayoutDashboard, Smartphone, Database, RefreshCw, Lock, Type, Zap, Brain,
  Upload, Download, Search
} from 'lucide-react'
import { cn, isElectron, requestNotificationPermission, getNotificationPermissionStatus, selectDataPath, getDataPath, migrateData, showFloatingWindow, usePlatform } from '@/shared'
import { Button, Input, Select, Checkbox } from '@/shared/components'
import { useTheme } from '@/shared/hooks'
import { useViewStore } from '@/modules/view'
import { useSettingsStore } from './store'
import type { AppSettings } from './types'
import { DEFAULT_SETTINGS } from './types'
import { AIConfigSection } from '@/modules/ai/components'

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const store = useSettingsStore()
  const settings = useSettingsStore(s => s.settings)

  const themes: { value: AppSettings['theme']; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun size={16} />, label: '浅色' },
    { value: 'dark', icon: <Moon size={16} />, label: '深色' },
    { value: 'system', icon: <Monitor size={16} />, label: '跟随系统' },
  ]

  return (
    <div
      className="flex items-center gap-1 p-1"
      style={{
        background: 'var(--paper-bg)',
        border: 'var(--border-sketch)',
        borderRadius: 'var(--border-radius-md)',
      }}
    >
      {themes.map(t => (
        <button
          key={t.value}
          onClick={() => {
            setTheme(t.value)
            store.setTheme(t.value)
          }}
          className={cn(
            'btn-hand flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all font-hand',
          )}
          style={{
            background: settings.theme === t.value ? 'var(--accent-orange)' : 'transparent',
            color: settings.theme === t.value ? 'white' : 'var(--ink-light)',
            borderRadius: 'var(--border-radius-md)',
            boxShadow: settings.theme === t.value ? 'var(--shadow-sketch)' : 'none',
          }}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function ShortcutConfig() {
  const store = useSettingsStore()
  const hotkeys = useSettingsStore(s => s.settings.hotkeys)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [capturedKey, setCapturedKey] = useState('')

  const HOTKEY_LABELS: Record<string, string> = {
    'newTask': '新建任务',
    'search': '搜索',
    'toggleSidebar': '切换侧边栏',
    'quickCapture': '快速捕获',
    'goToday': '回到今天',
  }

  const handleKeyDown = (e: React.KeyboardEvent, action: string) => {
    e.preventDefault()
    const parts: string[] = []
    if (e.ctrlKey) parts.push('Ctrl')
    if (e.altKey) parts.push('Alt')
    if (e.shiftKey) parts.push('Shift')
    if (e.metaKey) parts.push('Meta')
    if (!['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key)
    }
    if (parts.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      const combo = parts.join('+')
      setCapturedKey(combo)
      store.setHotkey(action, combo)
      setEditingKey(null)
    }
  }

  return (
    <div className="space-y-2">
      {Object.entries(HOTKEY_LABELS).map(([action, label]) => (
        <div key={action} className="flex items-center justify-between py-1.5">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>{label}</span>
          {editingKey === action ? (
            <input
              autoFocus
              className="input-hand px-2 py-1 text-xs text-center w-32 font-hand"
              style={{
                border: '2px solid var(--accent-orange)',
                background: 'rgba(255, 200, 150, 0.15)',
                color: 'var(--ink-black)',
                borderRadius: 'var(--border-radius-md)',
              }}
              value={capturedKey || '按下快捷键...'}
              onKeyDown={(e) => handleKeyDown(e, action)}
              onBlur={() => setEditingKey(null)}
              readOnly
            />
          ) : (
            <button
              onClick={() => { setEditingKey(action); setCapturedKey('') }}
              className="btn-hand px-2 py-1 text-xs font-mono font-hand"
              style={{
                background: 'var(--paper-bg)',
                color: 'var(--ink-light)',
                border: 'var(--border-sketch)',
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              {hotkeys[action] || '未设置'}
            </button>
          )}
        </div>
      ))}
    </div>
  )
}

export function SettingsPanel() {
  const store = useSettingsStore()
  const settings = useSettingsStore(s => s.settings)
  const electron = isElectron()
  const { isPhone, isTablet, isDesktop } = usePlatform()
  const setActiveTab = useViewStore(s => s.setActiveTab)
  const [notificationStatus, setNotificationStatus] = useState<string>(settings.notificationPermission)
  const [currentDataPath, setCurrentDataPath] = useState<string>('')
  const [isMigrating, setIsMigrating] = useState(false)
  const [webdavUrl, setWebdavUrl] = useState('')
  const [webdavUsername, setWebdavUsername] = useState('')
  const [webdavPassword, setWebdavPassword] = useState('')

  useEffect(() => {
    if (!useSettingsStore.getState().isLoaded) {
      store.load()
    }
  }, [])

  useEffect(() => {
    if (electron) {
      getNotificationPermissionStatus().then(status => {
        setNotificationStatus(status)
        store.setNotificationPermission(status as AppSettings['notificationPermission'])
      })
      getDataPath().then(path => setCurrentDataPath(path))
    }
  }, [electron])

  const handleRequestPermission = async () => {
    if (!electron) return
    const status = await requestNotificationPermission()
    setNotificationStatus(status)
    store.setNotificationPermission(status as AppSettings['notificationPermission'])
  }

  const getPermissionLabel = (status: string) => {
    switch (status) {
      case 'granted': return '已授权'
      case 'denied': return '已拒绝'
      default: return '未请求'
    }
  }

  const getPermissionColor = (status: string) => {
    switch (status) {
      case 'granted': return 'var(--accent-green, #22c55e)'
      case 'denied': return 'var(--accent-red, #ef4444)'
      default: return 'var(--ink-light)'
    }
  }

  const handleExport = async () => {
    try {
      const { db } = await import('@/core/database')
      const data: Record<string, any[]> = {}
      const tables = db.tables
      for (const table of tables) {
        data[table.name] = await table.toArray()
      }
      const blob = new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), data }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `note-plan-backup-${new Date().toISOString().slice(0,10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      store.setLastSyncTime(new Date().toISOString())
    } catch (e) {
      alert('导出失败: ' + (e as Error).message)
    }
  }

  const handleImport = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        if (!parsed.data) throw new Error('无效的备份文件')
        const { db } = await import('@/core/database')
        for (const [tableName, records] of Object.entries(parsed.data)) {
          const table = db.table(tableName)
          if (table) {
            await table.clear()
            if (Array.isArray(records) && records.length > 0) {
              await table.bulkPut(records)
            }
          }
        }
        store.setLastSyncTime(new Date().toISOString())
        alert('导入成功！数据已更新，建议刷新页面。')
        window.location.reload()
      } catch (err) {
        alert('导入失败: ' + (err as Error).message)
      }
    }
    input.click()
  }

  const handleWebdavTest = async () => {
    try {
      const response = await fetch(webdavUrl, {
        method: 'PROPFIND',
        headers: {
          'Authorization': 'Basic ' + btoa(`${webdavUsername}:${webdavPassword}`),
          'Depth': '0',
        },
      })
      if (response.ok || response.status === 207) {
        alert('WebDAV连接成功！')
      } else {
        alert(`连接失败: HTTP ${response.status}`)
      }
    } catch (e) {
      alert('连接失败: ' + (e as Error).message)
    }
  }

  const handleWebdavSync = async () => {
    alert('WebDAV同步功能开发中，请暂时使用导出/导入模式')
  }

  const handleLANDiscover = async () => {
    alert('局域网发现功能开发中，请暂时使用导出/导入模式')
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6 space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-hand" style={{ color: 'var(--ink-black)' }}>设置</h2>
          <Button variant="ghost" size="sm" onClick={() => store.resetToDefaults()}>
            <RotateCcw size={14} /> 恢复默认
          </Button>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Monitor size={16} />
            外观
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>主题</span>
              <ThemeSwitcher />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>语言</span>
              <Select
                value={settings.language}
                onChange={(v) => {
                  store.setLanguage(v)
                  if (v !== 'zh-CN') {
                    alert('完整多语言支持正在开发中，目前仅支持简体中文界面。语言设置已保存，部分系统文本可能会显示为英文。')
                  }
                }}
                options={[
                  { label: '简体中文', value: 'zh-CN' },
                  { label: 'English', value: 'en-US' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>默认视图</span>
              <Select
                value={settings.defaultView}
                onChange={(v) => store.setDefaultView(v as AppSettings['defaultView'])}
                options={[
                  { label: '列表', value: 'list' },
                  { label: '日历', value: 'calendar' },
                  { label: '看板', value: 'kanban' },
                  { label: '时间线', value: 'timeline' },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Rocket size={16} />
            启动
          </div>
          <div className="space-y-3 pl-6">
            <Checkbox
              checked={settings.autoStart}
              onChange={(v) => store.setAutoStart(v)}
              label="开机自动启动"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Keyboard size={16} />
            快捷键
          </div>
          <div className="pl-6">
            <ShortcutConfig />
          </div>
        </section>

        {electron && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
              <Folder size={16} />
              数据存储
            </div>
            <div className="space-y-3 pl-6">
              <div className="space-y-1">
                <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>当前数据路径</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-hand px-2 py-1" style={{
                    background: 'var(--paper-bg)',
                    border: 'var(--border-sketch)',
                    borderRadius: 'var(--border-radius-sm)',
                    color: 'var(--ink-gray)',
                    maxWidth: '300px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {currentDataPath || '加载中...'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={async () => {
                    const newPath = await selectDataPath()
                    if (newPath && newPath !== currentDataPath) {
                      setIsMigrating(true)
                      const success = await migrateData(newPath)
                      setIsMigrating(false)
                      if (success) {
                        store.setDataStoragePath(newPath)
                        alert('数据迁移成功！请重启应用以使用新的数据存储路径。')
                      } else {
                        alert('数据迁移失败，请检查路径是否有效。')
                      }
                    }
                  }}
                  disabled={isMigrating}
                >
                  {isMigrating ? '迁移中...' : '选择新路径并迁移'}
                </Button>
              </div>
            </div>
          </section>
        )}

        {electron && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
              <Shield size={16} />
              通知
            </div>
            <div className="space-y-3 pl-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>通知权限</span>
                <div className="flex items-center gap-2">
                  <span
                    className="text-xs font-hand font-medium"
                    style={{ color: getPermissionColor(notificationStatus) }}
                  >
                    {getPermissionLabel(notificationStatus)}
                  </span>
                  {notificationStatus !== 'granted' && (
                    <Button size="sm" onClick={handleRequestPermission}>
                      请求通知权限
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {electron && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
              <Minimize2 size={16} />
              关闭行为
            </div>
            <div className="space-y-3 pl-6">
              <Checkbox
                checked={settings.closeToTray}
                onChange={(v) => store.setCloseToTray(v)}
                label="关闭主窗口时最小化到托盘"
              />
            </div>
          </section>
        )}

        {electron && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
              <Layout size={16} />
              悬浮窗
            </div>
            <div className="space-y-3 pl-6">
              <Checkbox
                checked={settings.floatingWindowEnabled}
                onChange={(v) => {
                  store.setFloatingWindowEnabled(v)
                  if (v) {
                    showFloatingWindow()
                  }
                }}
                label="启用桌面悬浮窗"
              />
              {settings.floatingWindowEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>快捷键</span>
                  <span className="text-xs font-mono font-hand px-2 py-1" style={{ background: 'var(--paper-bg)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-md)' }}>
                    Ctrl+Alt+N
                  </span>
                  <span className="text-xs font-hand" style={{ color: 'var(--ink-gray)' }}>切换悬浮窗</span>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            {settings.dndEnabled ? <BellOff size={16} /> : <Bell size={16} />}
            勿扰模式
          </div>
          <div className="space-y-3 pl-6">
            <Checkbox
              checked={settings.dndEnabled}
              onChange={(v) => store.setDndEnabled(v)}
              label="启用勿扰模式"
            />
            {settings.dndEnabled && (
              <div className="flex items-center gap-3">
                <Input
                  type="time"
                  value={settings.dndStart}
                  onChange={(e) => store.setDndTime(e.target.value, settings.dndEnd)}
                />
                <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>至</span>
                <Input
                  type="time"
                  value={settings.dndEnd}
                  onChange={(e) => store.setDndTime(settings.dndStart, e.target.value)}
                />
              </div>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Target size={16} />
            目标与效率
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>每日目标（任务数）</span>
              <Input
                type="number"
                value={settings.dailyTarget}
                onChange={(e) => store.setDailyTarget(parseInt(e.target.value) || 5)}
                className="w-20 text-center"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>缓冲时间比例（%）</span>
              <Input
                type="number"
                value={settings.bufferTimePercent}
                onChange={(e) => store.setBufferTimePercent(parseInt(e.target.value) || 20)}
                className="w-20 text-center"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>原谅次数</span>
              <Input
                type="number"
                value={settings.forgivenessCount}
                onChange={(e) => store.setForgivenessCount(parseInt(e.target.value) || 3)}
                className="w-20 text-center"
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Type size={16} />
            字体与布局
          </div>
          <div className="space-y-3 pl-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>字体大小</span>
              <Select
                value={settings.fontSize}
                onChange={(v) => store.setFontSize(v as AppSettings['fontSize'])}
                options={[
                  { label: '小', value: 'small' },
                  { label: '中', value: 'medium' },
                  { label: '大', value: 'large' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>布局密度</span>
              <Select
                value={settings.layoutDensity}
                onChange={(v) => store.setLayoutDensity(v as AppSettings['layoutDensity'])}
                options={[
                  { label: '紧凑', value: 'compact' },
                  { label: '舒适', value: 'comfortable' },
                  { label: '宽松', value: 'spacious' },
                ]}
              />
            </div>
            {isDesktop && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>侧边栏位置</span>
                  <Select
                    value={settings.sidebarPosition}
                    onChange={(v) => store.setSidebarPosition(v as AppSettings['sidebarPosition'])}
                    options={[
                      { label: '左侧', value: 'left' },
                      { label: '右侧', value: 'right' },
                    ]}
                  />
                </div>
                <Checkbox
                  checked={settings.showSidebarLabels}
                  onChange={(v) => store.setShowSidebarLabels(v)}
                  label="显示侧边栏标签"
                />
              </>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>自定义字号(px)</span>
              <Input
                type="number"
                value={settings.fontSizeCustom || ''}
                onChange={(e) => store.setFontSizeCustom(parseInt(e.target.value) || 0)}
                className="w-20 text-center"
                placeholder="0=默认"
              />
            </div>
          </div>
        </section>

        {(isPhone || isTablet) && (
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
              <Smartphone size={16} />
              移动端
            </div>
            <div className="space-y-3 pl-6">
              <Checkbox
                checked={settings.swipeGestures}
                onChange={(v) => store.setSwipeGestures(v)}
                label="滑动手势"
              />
              <Checkbox
                checked={settings.hapticFeedback}
                onChange={(v) => store.setHapticFeedback(v)}
                label="触觉反馈"
              />
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Database size={16} />
            数据与安全
          </div>
          <div className="space-y-3 pl-6">
            <Checkbox
              checked={settings.confirmBeforeDelete}
              onChange={(v) => store.setConfirmBeforeDelete(v)}
              label="删除前确认"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>自动保存间隔</span>
              <Select
                value={String(settings.autoSaveInterval)}
                onChange={(v) => store.setAutoSaveInterval(parseInt(v, 10))}
                options={[
                  { label: '即时', value: '0' },
                  { label: '15秒', value: '15' },
                  { label: '30秒', value: '30' },
                  { label: '60秒', value: '60' },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <RefreshCw size={16} />
            数据同步
          </div>
          <div className="space-y-3 pl-6">
            <Checkbox
              checked={settings.syncEnabled}
              onChange={(v) => store.setSyncEnabled(v)}
              label="启用数据同步"
            />
            {settings.syncEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>同步方式</span>
                  <Select
                    value={settings.syncMethod}
                    onChange={(v) => store.setSyncMethod(v as AppSettings['syncMethod'])}
                    options={[
                      { label: '导出/导入', value: 'export_import' },
                      { label: 'WebDAV', value: 'webdav' },
                      { label: '局域网', value: 'lan' },
                    ]}
                  />
                </div>
                {settings.syncMethod === 'export_import' && (
                  <div className="space-y-2 p-3" style={{ background: 'var(--watercolor-blue)', borderRadius: 'var(--border-radius-md)', border: 'var(--border-sketch)' }}>
                    <p className="text-xs font-hand" style={{ color: 'var(--ink-gray)' }}>
                      导出/导入模式：手动将数据导出为JSON文件，在其他设备上导入即可完成同步。适合不频繁同步的场景。
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleExport}><Upload size={14} /> 导出数据</Button>
                      <Button size="sm" onClick={handleImport}><Download size={14} /> 导入数据</Button>
                    </div>
                  </div>
                )}
                {settings.syncMethod === 'webdav' && (
                  <div className="space-y-2 p-3" style={{ background: 'var(--watercolor-blue)', borderRadius: 'var(--border-radius-md)', border: 'var(--border-sketch)' }}>
                    <p className="text-xs font-hand" style={{ color: 'var(--ink-gray)' }}>
                      WebDAV模式：通过坚果云、NextCloud等WebDAV服务自动同步数据。需自行提供WebDAV服务。
                    </p>
                    <Input placeholder="WebDAV地址" value={webdavUrl} onChange={(e) => setWebdavUrl(e.target.value)} />
                    <Input placeholder="用户名" value={webdavUsername} onChange={(e) => setWebdavUsername(e.target.value)} />
                    <Input type="password" placeholder="密码/应用密码" value={webdavPassword} onChange={(e) => setWebdavPassword(e.target.value)} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleWebdavTest}>测试连接</Button>
                      <Button size="sm" onClick={handleWebdavSync}>立即同步</Button>
                    </div>
                  </div>
                )}
                {settings.syncMethod === 'lan' && (
                  <div className="space-y-2 p-3" style={{ background: 'var(--watercolor-blue)', borderRadius: 'var(--border-radius-md)', border: 'var(--border-sketch)' }}>
                    <p className="text-xs font-hand" style={{ color: 'var(--ink-gray)' }}>
                      局域网模式：同一WiFi下的设备可直接互相同步。确保设备在同一网络下。
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>自动同步</span>
                      <Checkbox checked={settings.autoSync} onChange={(v) => store.setAutoSync(v)} label="" />
                    </div>
                    <Button size="sm" onClick={handleLANDiscover}><Search size={14} /> 发现设备</Button>
                  </div>
                )}
                {settings.lastSyncTime && (
                  <div className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>
                    上次同步：{new Date(settings.lastSyncTime).toLocaleString()}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Lock size={16} />
            隐私与安全
          </div>
          <div className="space-y-3 pl-6">
            <Checkbox
              checked={settings.lockEnabled}
              onChange={(v) => store.setLockEnabled(v)}
              label="启用应用锁"
            />
            {settings.lockEnabled && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>锁定方式</span>
                  <Select
                    value={settings.lockMethod}
                    onChange={(v) => store.setLockMethod(v as AppSettings['lockMethod'])}
                    options={[
                      { label: 'PIN码', value: 'pin' },
                      { label: '密码', value: 'password' },
                      { label: '生物识别', value: 'biometric' },
                    ]}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>自动锁定(分钟)</span>
                  <Input
                    type="number"
                    value={settings.lockTimeout}
                    onChange={(e) => store.setLockTimeout(parseInt(e.target.value) || 5)}
                    className="w-20 text-center"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Brain size={16} />
            AI 助手
          </div>
          <div className="pl-6">
            <AIConfigSection />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>
            <Zap size={16} />
            高级
          </div>
          <div className="space-y-3 pl-6">
            <Checkbox
              checked={settings.animationEnabled}
              onChange={(v) => store.setAnimationEnabled(v)}
              label="启用动画效果"
            />
            <Checkbox
              checked={settings.hapticFeedback}
              onChange={(v) => store.setHapticFeedback(v)}
              label="触觉反馈（移动端）"
            />
          </div>
        </section>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import { useTaskStore } from '@/modules/task'
import { useInspirationStickyStore } from '@/modules/inspiration-sticky'
import { useNoteStore } from '@/modules/note'
import type { NoteState } from '@/modules/note'
import type { KnowledgeBase, Folder, DocMeta } from '@/modules/note'
import type { InspirationSource } from '@/modules/inspiration-sticky'
import { cn, notifyDataChanged, isElectron, setFloatingAlwaysOnTop, getFloatingAlwaysOnTop, fetchContent } from '@/shared'
import type { Priority } from '@/shared'
import { Icon } from '@/shared/Icons'

type FloatingTab = 'quick' | 'todo' | 'note' | 'link'

const PRIORITY_OPTIONS: { value: Priority; label: string; iconName: string }[] = [
  { value: 'urgent', label: '紧急', iconName: 'priority-high' },
  { value: 'high', label: '高', iconName: 'priority-high' },
  { value: 'medium', label: '中', iconName: 'priority-medium' },
  { value: 'low', label: '低', iconName: 'priority-low' },
]

const TAB_CONFIG: { id: FloatingTab; iconName: string; label: string }[] = [
  { id: 'quick', iconName: 'lightbulb', label: '灵感' },
  { id: 'todo', iconName: 'todo', label: '待办' },
  { id: 'note', iconName: 'note', label: '笔记' },
  { id: 'link', iconName: 'link', label: '链接' },
]

export function FloatingWindow() {
  const [isExpanded, setIsExpanded] = useState(true)
  const [activeTab, setActiveTab] = useState<FloatingTab>('quick')
  const [showSuccess, setShowSuccess] = useState(false)
  const [isPinned, setIsPinned] = useState(true)

  const pendingTaskCount = useTaskStore(s => s.getPendingTaskCount())
  const todayTasks = useTaskStore(s => s.getTodayTasks())
  const groups = useTaskStore(s => s.groups)

  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState<Priority>('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [filterGroupId, setFilterGroupId] = useState<string | null>(null)

  const [inspirationContent, setInspirationContent] = useState('')
  const [inspirationSource, setInspirationSource] = useState<InspirationSource>('manual')

  const [linkUrl, setLinkUrl] = useState('')
  const [linkFetching, setLinkFetching] = useState(false)
  const [linkError, setLinkError] = useState('')

  const taskStore = useTaskStore()
  const inspirationStickyStore = useInspirationStickyStore()
  const noteStore = useNoteStore()

  useEffect(() => {
    if (isElectron()) {
      getFloatingAlwaysOnTop().then(pinned => setIsPinned(pinned))
    }
  }, [])

  const handleTogglePin = useCallback(async () => {
    if (!isElectron()) return
    const newPinned = !isPinned
    const result = await setFloatingAlwaysOnTop(newPinned)
    setIsPinned(result)
  }, [isPinned])

  const handleCollapse = () => {
    setIsExpanded(false)
  }

  const handleExpand = () => {
    setIsExpanded(true)
  }

  const showSuccessMessage = () => {
    setShowSuccess(true)
    setTimeout(() => {
      setShowSuccess(false)
      setTaskTitle('')
      setTaskPriority('medium')
      setTaskDueDate('')
      setInspirationContent('')
      setInspirationSource('manual')
      setLinkUrl('')
      setLinkError('')
    }, 800)
  }

  const handleSubmitTask = async () => {
    if (!taskTitle.trim()) return
    await taskStore.createTask({
      title: taskTitle.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || null,
    })
    notifyDataChanged({ type: 'task' })
    showSuccessMessage()
  }

  const handleSubmitInspiration = async () => {
    if (!inspirationContent.trim()) return
    await inspirationStickyStore.addInspiration({
      title: inspirationContent.trim().length > 50 ? inspirationContent.trim().slice(0, 50) + '...' : inspirationContent.trim(),
      content: inspirationContent.trim(),
      source: inspirationSource,
    })
    notifyDataChanged({ type: 'inspirationSticky' })
    showSuccessMessage()
  }

  const handleFetchLink = async () => {
    if (!linkUrl.trim()) return
    setLinkFetching(true)
    setLinkError('')
    try {
      const result = await fetchContent(linkUrl.trim())
      if (!result.success || !result.data) {
        setLinkError(result.error || '采集失败')
        setLinkFetching(false)
        return
      }
      const { data } = result
      const source: InspirationSource = data.source === 'douyin' ? 'douyin' : data.source === 'wechat' ? 'wechat' : 'share'
      await inspirationStickyStore.addInspiration({
        title: data.title || '未命名',
        content: data.content || data.title || '',
        source,
        sourceUrl: data.sourceUrl || linkUrl.trim(),
        sourceAuthor: data.author || '',
        coverImage: data.coverImage || '',
      })
      notifyDataChanged({ type: 'inspirationSticky' })
      showSuccessMessage()
    } catch {
      setLinkError('网络错误，请重试')
    } finally {
      setLinkFetching(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, submitFn: () => void) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      submitFn()
    }
  }

  if (!isExpanded) {
    return (
      <div
        className="flex flex-col items-center justify-end h-full pb-4 cursor-pointer"
        onClick={handleExpand}
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110"
          style={{
            background: 'var(--accent-orange)',
            border: '3px solid var(--ink-black)',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        {pendingTaskCount > 0 && (
          <div
            className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold rounded-full px-1"
            style={{
              background: 'var(--accent-red)',
              color: 'white',
              border: '2px solid var(--ink-black)',
            }}
          >
            {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
          </div>
        )}
        <p className="font-hand text-xs mt-2" style={{ color: 'var(--ink-gray)' }}>点击展开</p>
      </div>
    )
  }

  return (
    <div
      className="h-full"
      style={{ background: 'transparent' }}
    >
      <div
        className="flex flex-col h-full overflow-hidden"
        style={{
          width: '100%',
          maxWidth: 360,
          background: 'var(--paper-bg)',
          border: '3px solid var(--ink-black)',
          borderRadius: 'var(--border-radius-lg, 16px)',
          boxShadow: '4px 4px 0px var(--ink-black)',
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 shrink-0"
          style={{
            borderBottom: '2px dashed var(--ink-light)',
            background: 'var(--accent-orange)',
            WebkitAppRegion: 'drag',
          } as React.CSSProperties}
        >
          <span className="font-hand font-bold text-white text-sm" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}><Icon name="edit" size={14} /> Note-Plan</span>
          <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties} className="flex items-center gap-1">
            <button
              onClick={handleTogglePin}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: isPinned ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.2)', color: 'white' }}
              title={isPinned ? '取消置顶（全屏时不遮挡）' : '置顶显示'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isPinned ? 'white' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 17v5" />
                <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
              </svg>
            </button>
            <button
              onClick={handleCollapse}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.3)', color: 'white' }}
              title="最小化"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => {
                if (isElectron() && window.electronAPI) {
                  window.electronAPI.hideFloatingWindow()
                }
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors"
              style={{ background: 'rgba(255,255,255,0.3)', color: 'white' }}
              title="关闭"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {showSuccess && (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center">
              <Icon name="success" size={40} style={{ color: 'var(--accent-green)' }} />
              <p className="font-hand text-base font-bold" style={{ color: 'var(--accent-green)' }}>保存成功！</p>
            </div>
          </div>
        )}

        {!showSuccess && activeTab === 'quick' && (
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            <textarea
              placeholder="写下你的灵感... (Ctrl+Enter 提交)"
              value={inspirationContent}
              onChange={(e) => setInspirationContent(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, handleSubmitInspiration)}
              rows={4}
              className="input-hand w-full font-hand text-sm px-3 py-2 resize-none"
              style={{
                border: '2px solid var(--ink-black)',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--paper-bg)',
                color: 'var(--ink-black)',
              }}
              autoFocus
            />
            <div className="flex items-center gap-2">
              <span className="font-hand text-xs shrink-0" style={{ color: 'var(--ink-gray)' }}>来源</span>
              <div className="flex gap-1">
                {[
                  { value: 'manual', label: '手动' },
                  { value: 'clipboard', label: '剪贴板' },
                  { value: 'share', label: '分享' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setInspirationSource(opt.value as InspirationSource)}
                    className="btn-hand px-2 py-1 text-xs font-hand"
                    style={{
                      background: inspirationSource === opt.value ? 'var(--accent-orange)' : 'var(--paper-bg)',
                      color: inspirationSource === opt.value ? 'white' : 'var(--ink-black)',
                      border: '2px solid var(--ink-black)',
                      borderRadius: 'var(--border-radius-md)',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={handleSubmitInspiration}
              disabled={!inspirationContent.trim()}
              className="btn-hand w-full py-2 font-hand font-bold text-sm"
              style={{
                background: inspirationContent.trim() ? 'var(--accent-orange)' : 'var(--ink-light)',
                color: 'white',
                border: '2px solid var(--ink-black)',
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              <Icon name="lightbulb" size={14} style={{ color: 'var(--accent-orange)' }} /> 保存灵感
            </button>
          </div>
        )}

        {!showSuccess && activeTab === 'todo' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 space-y-3 shrink-0" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="添加待办... (Ctrl+Enter)"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, handleSubmitTask)}
                  className="input-hand flex-1 font-hand text-sm px-3 py-2"
                  style={{
                    border: '2px solid var(--ink-black)',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'var(--paper-bg)',
                    color: 'var(--ink-black)',
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSubmitTask}
                  disabled={!taskTitle.trim()}
                  className="btn-hand px-3 py-2 font-hand font-bold text-xs shrink-0"
                  style={{
                    background: taskTitle.trim() ? 'var(--accent-orange)' : 'var(--ink-light)',
                    color: 'white',
                    border: '2px solid var(--ink-black)',
                    borderRadius: 'var(--border-radius-md)',
                  }}
                >
                  添加
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {PRIORITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setTaskPriority(opt.value)}
                    className={cn('btn-hand px-2 py-0.5 text-xs font-hand')}
                    style={{
                      background: taskPriority === opt.value ? 'var(--accent-orange)' : 'var(--paper-bg)',
                      color: taskPriority === opt.value ? 'white' : 'var(--ink-black)',
                      border: '2px solid var(--ink-black)',
                      borderRadius: 'var(--border-radius-md)',
                    }}
                  >
                    <Icon name={opt.iconName} size={14} />
                  </button>
                ))}
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="input-hand font-hand text-xs px-2 py-0.5"
                  style={{
                    border: '2px solid var(--ink-black)',
                    borderRadius: 'var(--border-radius-md)',
                    background: 'var(--paper-bg)',
                    color: 'var(--ink-black)',
                  }}
                />
              </div>
              {groups.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setFilterGroupId(null)}
                    className={cn('btn-hand px-2 py-0.5 text-xs font-hand')}
                    style={{
                      background: filterGroupId === null ? 'var(--accent-orange)' : 'var(--paper-bg)',
                      color: filterGroupId === null ? 'white' : 'var(--ink-black)',
                      border: '2px solid var(--ink-black)',
                      borderRadius: 'var(--border-radius-md)',
                    }}
                  >
                    全部
                  </button>
                  {groups.map(group => (
                    <button
                      key={group.id}
                      onClick={() => setFilterGroupId(filterGroupId === group.id ? null : group.id)}
                      className={cn('btn-hand px-2 py-0.5 text-xs font-hand')}
                      style={{
                        background: filterGroupId === group.id ? (group.color || 'var(--accent-orange)') : 'var(--paper-bg)',
                        color: filterGroupId === group.id ? 'white' : 'var(--ink-black)',
                        border: '2px solid var(--ink-black)',
                        borderRadius: 'var(--border-radius-md)',
                      }}
                    >
                      <Icon name={group.icon || 'folder'} size={14} /> {group.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-1">
              {(() => {
                const filteredTasks = filterGroupId ? todayTasks.filter(t => t.groupId === filterGroupId) : todayTasks
                return (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-hand text-xs font-bold" style={{ color: 'var(--ink-gray)' }}>今日待办</span>
                      <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)' }}>
                        {filteredTasks.filter(t => t.status === 'completed').length}/{filteredTasks.length}
                      </span>
                    </div>
                    {filteredTasks.length > 0 ? (
                      filteredTasks.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors"
                    style={{
                      background: task.status === 'completed' ? 'var(--watercolor-green)' : 'var(--paper-bg)',
                      border: '1px solid var(--ink-light)',
                      borderRadius: 'var(--border-radius-sm)',
                    }}
                  >
                    <button
                      onClick={() => task.status === 'completed' ? taskStore.uncompleteTask(task.id) : taskStore.completeTask(task.id)}
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                      style={{
                        background: task.status === 'completed' ? 'var(--accent-green)' : 'transparent',
                        borderColor: 'var(--ink-black)',
                      }}
                    >
                      {task.status === 'completed' && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </button>
                    <span
                      className={cn('font-hand text-xs flex-1 min-w-0 truncate', task.status === 'completed' && 'line-through opacity-50')}
                      style={{ color: 'var(--ink-black)' }}
                    >
                      {task.title}
                    </span>
                    {task.isImportant && <Icon name="star" size={12} style={{ color: 'var(--accent-orange)' }} className="shrink-0" />}
                    <span className="shrink-0">
                      <Icon name={PRIORITY_OPTIONS.find(p => p.value === task.priority)?.iconName || 'priority-medium'} size={12} />
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <Icon name="sparkle" size={24} style={{ color: 'var(--accent-orange)' }} />
                  <p className="font-hand text-xs" style={{ color: 'var(--ink-light)' }}>今天没有待办</p>
                </div>
              )}
                   </>
                 )
               })()}
            </div>
          </div>
        )}

        {!showSuccess && activeTab === 'note' && (
          <FloatingNoteTab noteStore={noteStore} />
        )}

        {!showSuccess && activeTab === 'link' && (
          <div className="flex-1 p-4 space-y-3 overflow-y-auto">
            <p className="font-hand text-sm text-center" style={{ color: 'var(--ink-gray)' }}>
              <Icon name="link" size={14} style={{ color: 'var(--ink-gray)' }} /> 粘贴分享链接，自动采集内容
            </p>
            <input
              type="url"
              placeholder="粘贴抖音/微信/网页链接..."
              value={linkUrl}
              onChange={(e) => { setLinkUrl(e.target.value); setLinkError('') }}
              onKeyDown={(e) => handleKeyDown(e, handleFetchLink)}
              className="input-hand w-full font-hand text-sm px-3 py-2"
              style={{
                border: '2px solid var(--ink-black)',
                borderRadius: 'var(--border-radius-md)',
                background: 'var(--paper-bg)',
                color: 'var(--ink-black)',
              }}
              autoFocus
            />
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-hand text-xs px-2 py-1" style={{ background: 'var(--watercolor-pink)', border: '1px solid var(--ink-black)', borderRadius: 'var(--border-radius-sm)' }}>
                <Icon name="music" size={14} /> 抖音
              </span>
              <span className="font-hand text-xs px-2 py-1" style={{ background: 'var(--watercolor-green)', border: '1px solid var(--ink-black)', borderRadius: 'var(--border-radius-sm)' }}>
                <Icon name="chat" size={14} /> 微信公众号
              </span>
              <span className="font-hand text-xs px-2 py-1" style={{ background: 'var(--watercolor-blue)', border: '1px solid var(--ink-black)', borderRadius: 'var(--border-radius-sm)' }}>
                <Icon name="globe" size={14} /> 通用网页
              </span>
            </div>
            {linkError && (
              <p className="font-hand text-xs" style={{ color: 'var(--accent-red)' }}><Icon name="error" size={12} style={{ color: 'var(--accent-red)' }} /> {linkError}</p>
            )}
            <button
              onClick={handleFetchLink}
              disabled={!linkUrl.trim() || linkFetching}
              className="btn-hand w-full py-2 font-hand font-bold text-sm"
              style={{
                background: linkUrl.trim() && !linkFetching ? 'var(--accent-orange)' : 'var(--ink-light)',
                color: 'white',
                border: '2px solid var(--ink-black)',
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              {linkFetching ? <><Icon name="clock" size={14} /> 采集中...</> : <><Icon name="download" size={14} /> 采集并保存</>}
            </button>
            <div className="mt-2 p-3" style={{ background: 'var(--watercolor-yellow)', border: '2px dashed var(--ink-light)', borderRadius: 'var(--border-radius-md)' }}>
              <p className="font-hand text-xs" style={{ color: 'var(--ink-gray)' }}>
                <Icon name="lightbulb" size={12} style={{ color: 'var(--accent-orange)' }} /> 提示：在抖音/微信中点击分享 → 复制链接 → 粘贴到此处，即可自动提取标题、正文等信息并保存为灵感记录
              </p>
            </div>
          </div>
        )}

        <div
          className="flex items-center justify-around shrink-0 px-2 py-1.5"
          style={{
            borderTop: '2px dashed var(--ink-light)',
            background: 'var(--paper-bg)',
          }}
        >
          {TAB_CONFIG.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center gap-0.5 px-2 py-1 rounded transition-colors"
              style={{
                background: activeTab === tab.id ? 'var(--watercolor-yellow)' : 'transparent',
                border: activeTab === tab.id ? '2px solid var(--ink-black)' : '2px solid transparent',
                borderRadius: 'var(--border-radius-md)',
              }}
            >
              <Icon name={tab.iconName} size={16} />
              <span className="font-hand text-[10px] font-bold" style={{ color: activeTab === tab.id ? 'var(--ink-black)' : 'var(--ink-gray)' }}>
                {tab.label}
              </span>
              {tab.id === 'todo' && pendingTaskCount > 0 && (
                <span
                  className="absolute -top-1 -right-1 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-bold rounded-full px-0.5"
                  style={{ background: 'var(--accent-red)', color: 'white' }}
                >
                  {pendingTaskCount > 9 ? '9+' : pendingTaskCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FloatingNoteTab({ noteStore }: { noteStore: NoteState }) {
  const [selectedKbId, setSelectedKbId] = useState<string | null>(null)
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [saving, setSaving] = useState(false)

  const knowledgeBases: KnowledgeBase[] = noteStore.knowledgeBases

  const currentKb: KnowledgeBase | undefined = knowledgeBases.find((kb: KnowledgeBase) => kb.id === selectedKbId)
  const currentFolder: Folder | undefined = currentKb?.folders.find((f: Folder) => f.id === selectedFolderId)

  useEffect(() => {
    if (!selectedKbId && knowledgeBases.length > 0) {
      setSelectedKbId(knowledgeBases[0].id)
    }
  }, [knowledgeBases, selectedKbId])

  const handleOpenDoc = async (docId: string) => {
    await noteStore.openDoc(docId)
    setSelectedDocId(docId)
    setEditTitle(noteStore.editingDocTitle)
    setEditContent(noteStore.editingDocContent)
  }

  const handleSaveDoc = async () => {
    if (!selectedDocId) return
    setSaving(true)
    try {
      await noteStore.saveDoc(editTitle, editContent, noteStore.editingDocTags)
      notifyDataChanged({ type: 'note' })
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (selectedDocId) {
      noteStore.closeDoc()
      setSelectedDocId(null)
      setEditTitle('')
      setEditContent('')
    } else if (selectedFolderId) {
      setSelectedFolderId(null)
    }
  }

  if (selectedDocId) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden p-3 space-y-2">
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleBack}
            className="btn-hand px-2 py-1 text-xs"
            style={{ background: 'var(--paper-bg)', border: '2px solid var(--ink-black)', borderRadius: 'var(--border-radius-md)' }}
          >
            ← 返回
          </button>
          <span className="font-hand font-bold text-xs truncate flex-1" style={{ color: 'var(--ink-black)' }}>
            <Icon name="edit" size={14} /> 编辑笔记
          </span>
          <button
            onClick={handleSaveDoc}
            disabled={saving}
            className="btn-hand px-2 py-1 text-xs font-hand font-bold"
            style={{
              background: saving ? 'var(--ink-light)' : 'var(--accent-green)',
              color: 'white',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            {saving ? <Icon name="clock" size={14} /> : <><Icon name="note" size={14} /> 保存</>}
          </button>
        </div>
        <input
          type="text"
          placeholder="笔记标题..."
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="input-hand w-full font-hand text-sm px-2 py-1.5"
          style={{
            border: '2px solid var(--ink-black)',
            borderRadius: 'var(--border-radius-md)',
            background: 'var(--paper-bg)',
            color: 'var(--ink-black)',
          }}
        />
        <textarea
          placeholder="笔记内容..."
          value={editContent}
          onChange={(e) => setEditContent(e.target.value)}
          rows={8}
          className="input-hand w-full font-hand text-xs px-2 py-1.5 resize-none flex-1"
          style={{
            border: '2px solid var(--ink-black)',
            borderRadius: 'var(--border-radius-md)',
            background: 'var(--paper-bg)',
            color: 'var(--ink-black)',
          }}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      <div className="flex items-center gap-2 mb-2">
        {selectedFolderId && (
          <button
            onClick={handleBack}
            className="btn-hand px-2 py-1 text-xs"
            style={{ background: 'var(--paper-bg)', border: '2px solid var(--ink-black)', borderRadius: 'var(--border-radius-md)' }}
          >
            ← 返回
          </button>
        )}
        <span className="font-hand font-bold text-xs" style={{ color: 'var(--ink-black)' }}>
          <Icon name="note" size={14} /> 知识库
        </span>
      </div>

      {!selectedFolderId && (
        <>
          {knowledgeBases.length === 0 ? (
            <div className="text-center py-6">
              <Icon name="document" size={24} style={{ color: 'var(--ink-light)' }} />
              <p className="font-hand text-xs" style={{ color: 'var(--ink-light)' }}>暂无知识库</p>
              <p className="font-hand text-xs" style={{ color: 'var(--ink-light)' }}>请在主窗口中创建</p>
            </div>
          ) : (
            <>
              <div className="flex gap-1 flex-wrap mb-2">
                {knowledgeBases.map((kb: KnowledgeBase) => (
                  <button
                    key={kb.id}
                    onClick={() => { setSelectedKbId(kb.id); setSelectedFolderId(null) }}
                    className="btn-hand px-2 py-1 text-xs font-hand"
                    style={{
                      background: selectedKbId === kb.id ? 'var(--accent-orange)' : 'var(--paper-bg)',
                      color: selectedKbId === kb.id ? 'white' : 'var(--ink-black)',
                      border: '2px solid var(--ink-black)',
                      borderRadius: 'var(--border-radius-md)',
                    }}
                  >
                    <Icon name={kb.icon || 'folder'} size={14} /> {kb.name}
                  </button>
                ))}
              </div>
              {currentKb && currentKb.folders.map((folder: Folder) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className="w-full btn-hand flex items-center gap-2 px-3 py-2 text-left"
                  style={{
                    background: 'var(--watercolor-blue)',
                    border: '2px solid var(--ink-black)',
                    borderRadius: 'var(--border-radius-md)',
                  }}
                >
                  <Icon name="folder" size={14} />
                  <span className="font-hand text-xs font-bold flex-1" style={{ color: 'var(--ink-black)' }}>{folder.name}</span>
                  <span className="font-hand text-[10px]" style={{ color: 'var(--ink-gray)' }}>{folder.docs.length}篇</span>
                </button>
              ))}
            </>
          )}
        </>
      )}

      {selectedFolderId && currentFolder && (
        <>
          <p className="font-hand text-xs font-bold mb-1" style={{ color: 'var(--ink-gray)' }}>
            <Icon name="folder" size={14} /> {currentFolder.name}
          </p>
          {currentFolder.docs.length === 0 ? (
            <div className="text-center py-4">
              <p className="font-hand text-xs" style={{ color: 'var(--ink-light)' }}>暂无笔记</p>
            </div>
          ) : (
            currentFolder.docs.map((doc: DocMeta) => (
              <button
                key={doc.id}
                onClick={() => handleOpenDoc(doc.id)}
                className="w-full btn-hand flex items-center gap-2 px-3 py-2 text-left"
                style={{
                  background: 'var(--paper-bg)',
                  border: '2px solid var(--ink-light)',
                  borderRadius: 'var(--border-radius-md)',
                }}
              >
                <Icon name="document" size={12} />
                <div className="flex-1 min-w-0">
                  <p className="font-hand text-xs font-bold truncate" style={{ color: 'var(--ink-black)' }}>
                    {doc.title || '无标题'}
                  </p>
                  <p className="font-hand text-[10px]" style={{ color: 'var(--ink-gray)' }}>
                    {doc.updatedAt.slice(0, 10)}
                  </p>
                </div>
              </button>
            ))
          )}
        </>
      )}
    </div>
  )
}

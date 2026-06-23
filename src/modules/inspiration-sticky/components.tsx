import { useState, useEffect, useRef, useMemo, useCallback } from 'react'

import { useInspirationStickyStore } from './store'
import { fetchContent } from '@/shared'
import type { InspirationStickyNote, InspirationCategory, InspirationSource, StickyColor } from './types'
import { Icon } from '@/shared/Icons'

const SOURCE_CONFIG: Record<InspirationSource, { label: string; color: string }> = {
  douyin: { label: '抖音', color: 'var(--accent-red)' },
  wechat: { label: '微信', color: 'var(--accent-green)' },
  manual: { label: '手动', color: 'var(--accent-orange)' },
  clipboard: { label: '剪贴板', color: 'var(--accent-blue)' },
  share: { label: '分享', color: 'var(--ink-gray)' },
}

const COLOR_STYLE_MAP: Record<StickyColor, React.CSSProperties> = {
  yellow: { background: 'var(--watercolor-yellow)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-lg)' },
  blue: { background: 'var(--watercolor-blue)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-lg)' },
  pink: { background: 'var(--watercolor-pink)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-lg)' },
  green: { background: 'var(--watercolor-green)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-lg)' },
  orange: { background: 'rgba(255, 200, 150, 0.3)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-lg)' },
  purple: { background: 'rgba(200, 180, 255, 0.3)', border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-lg)' },
}

const COLOR_DOT_MAP: Record<StickyColor, React.CSSProperties> = {
  yellow: { background: 'var(--watercolor-yellow)', border: '2px solid var(--border-sketch)', borderRadius: '50%' },
  blue: { background: 'var(--watercolor-blue)', border: '2px solid var(--border-sketch)', borderRadius: '50%' },
  pink: { background: 'var(--watercolor-pink)', border: '2px solid var(--border-sketch)', borderRadius: '50%' },
  green: { background: 'var(--watercolor-green)', border: '2px solid var(--border-sketch)', borderRadius: '50%' },
  orange: { background: 'rgba(255, 200, 150, 0.3)', border: '2px solid var(--border-sketch)', borderRadius: '50%' },
  purple: { background: 'rgba(200, 180, 255, 0.3)', border: '2px solid var(--border-sketch)', borderRadius: '50%' },
}

const COLOR_OPTIONS: StickyColor[] = ['yellow', 'blue', 'pink', 'green', 'orange', 'purple']
const COLOR_LABEL: Record<StickyColor, string> = {
  yellow: '黄色', blue: '蓝色', pink: '粉色', green: '绿色', orange: '橙色', purple: '紫色',
}

const CATEGORY_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

function InspirationCard({ item, onOpenDetail }: { item: InspirationStickyNote; onOpenDetail: (item: InspirationStickyNote) => void }) {
  const store = useInspirationStickyStore()
  const sourceConfig = SOURCE_CONFIG[item.source]
  const [showColorPicker, setShowColorPicker] = useState(false)

  const handleColorChange = async (color: StickyColor) => {
    await store.updateItem(item.id, { color })
    setShowColorPicker(false)
  }

  const cardStyle: React.CSSProperties = item.color !== 'yellow'
    ? COLOR_STYLE_MAP[item.color]
    : {
        background: 'var(--paper-bg)',
      }

  return (
    <div
      className={`card-hand relative ${item.isPinned ? 'ring-2' : ''}`}
      style={{
        ...cardStyle,
        ...(item.isPinned ? { ringColor: 'var(--accent-orange)' } : {}),
      }}
    >
      {item.isPinned && (
        <div
          className="absolute -top-2 -right-2 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold"
          style={{ background: 'var(--accent-orange)', color: 'white' }}
        >
          <Icon name="pin" size={12} />
        </div>
      )}

      {item.status === 'unread' && (
        <div
          className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full"
          style={{ background: 'var(--accent-blue)' }}
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        <span
          className="tag-hand text-xs"
          style={{ background: sourceConfig.color, color: 'white', borderColor: sourceConfig.color }}
        >
          {sourceConfig.label}
        </span>
        {item.isFavorite && (
          <Icon name="star" size={14} style={{ color: 'var(--accent-orange)' }} />
        )}
      </div>

      <h3
        className="font-hand font-bold text-sm mb-1 leading-snug cursor-pointer"
        style={{ color: 'var(--ink-black)' }}
        onClick={() => onOpenDetail(item)}
      >
        {item.title}
      </h3>

      {item.content && (
        <div
          className="relative cursor-pointer group"
          onClick={() => onOpenDetail(item)}
        >
          <p
            className="font-hand text-xs mb-2 leading-relaxed"
            style={{
              color: 'var(--ink-gray)',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {item.content}
          </p>
          <span
            className="font-hand text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: 'var(--accent-blue)' }}
          >
            查看更多
          </span>
        </div>
      )}

      {item.coverImage && (
        <div className="mb-2 rounded overflow-hidden" style={{ border: 'var(--border-sketch)' }}>
          <img
            src={item.coverImage}
            alt={item.title}
            className="w-full h-32 object-cover"
            style={{ borderRadius: 'var(--border-radius-sm)' }}
          />
        </div>
      )}

      {(item.sourceAuthor || item.sourceUrl) && (
        <div className="flex items-center gap-1 mb-2">
          {item.sourceAuthor && (
            <span className="font-hand text-xs" style={{ color: 'var(--ink-light)' }}>
              {item.sourceAuthor}
            </span>
          )}
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 font-hand text-xs transition-colors"
              style={{ color: 'var(--accent-blue)' }}
            >
              <Icon name="link" size={12} />
              链接
            </a>
          )}
        </div>
      )}

      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {item.tags.map((tag, i) => (
            <span
              key={i}
              className="tag-hand text-xs"
              style={{ color: 'var(--ink-gray)' }}
            >
              <Icon name="tag" size={10} className="inline mr-0.5" />
              {tag}
            </span>
          ))}
        </div>
      )}

      <div
        className="flex items-center gap-1 pt-2"
        style={{ borderTop: '1px dashed var(--ink-light)' }}
      >
        <button
          onClick={() => store.togglePin(item.id)}
          className="p-1 rounded transition-colors"
          style={{ color: item.isPinned ? 'var(--accent-orange)' : 'var(--ink-light)' }}
          title={item.isPinned ? '取消置顶' : '置顶'}
        >
          {item.isPinned ? <Icon name="pin" size={14} /> : <Icon name="pin" size={14} />}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1 rounded transition-colors"
            title="更换颜色"
          >
            <div className="w-3.5 h-3.5" style={COLOR_DOT_MAP[item.color]} />
          </button>
          {showColorPicker && (
            <div
              className="absolute top-8 left-0 z-10 p-2 flex gap-1"
              style={{
                background: 'var(--paper-bg)',
                border: 'var(--border-sketch)',
                borderRadius: 'var(--border-radius-md)',
                boxShadow: 'var(--shadow-sketch)',
              }}
            >
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => handleColorChange(c)}
                  className="w-5 h-5 hover:scale-110 transition-transform"
                  style={{
                    ...COLOR_DOT_MAP[c],
                    ...(item.color === c ? { outline: '2px solid var(--ink-black)', outlineOffset: '1px' } : {}),
                  }}
                  title={COLOR_LABEL[c]}
                />
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => store.toggleFavorite(item.id)}
          className="p-1 rounded transition-colors font-hand text-sm"
          style={{ color: item.isFavorite ? 'var(--accent-orange)' : 'var(--ink-light)' }}
          title={item.isFavorite ? '取消收藏' : '收藏'}
        >
          {item.isFavorite ? <Icon name="star" size={14} /> : <Icon name="star" size={14} style={{ fill: 'none' }} />}
        </button>
        {item.status === 'unread' && (
          <button
            onClick={() => store.markRead(item.id)}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--accent-blue)' }}
            title="标记已读"
          >
            <Icon name="book-open" size={14} />
          </button>
        )}
        <button
          onClick={() => store.deleteItem(item.id)}
          className="p-1 rounded transition-colors ml-auto"
          style={{ color: 'var(--accent-red)' }}
          title="删除"
        >
          <Icon name="delete" size={14} />
        </button>
      </div>
    </div>
  )
}

function QuickCapture({ isOpen, onClose, defaultSource }: { isOpen: boolean; onClose: () => void; defaultSource?: InspirationSource }) {
  const store = useInspirationStickyStore()
  const categories = useInspirationStickyStore(s => s.categories)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [tagsInput, setTagsInput] = useState('')
  const [fetchUrl, setFetchUrl] = useState('')
  const [isFetching, setIsFetching] = useState(false)
  const [source, setSource] = useState<InspirationSource>(defaultSource || 'manual')

  useEffect(() => {
    if (isOpen) {
      setTitle('')
      setContent('')
      setCategoryId(null)
      setTagsInput('')
      setFetchUrl('')
      setIsFetching(false)
      setSource(defaultSource || 'manual')
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSave = async () => {
    if (!title.trim() && !content.trim()) return
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)
    await store.addInspiration({
      title: title.trim() || '未命名灵感',
      content: content.trim(),
      source,
      categoryId,
      tags,
    })
    onClose()
  }

  const handleImportClipboard = async () => {
    const result = await store.importFromClipboard()
    if (result) {
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleSave()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg mx-4 animate-fade-in"
        style={{
          background: 'var(--paper-bg)',
          border: 'var(--border-sketch)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-sketch)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '2px dashed var(--ink-light)' }}
        >
          <h2 className="text-lg font-semibold font-hand" style={{ color: 'var(--ink-black)' }}>
            快速采集
          </h2>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: 'var(--ink-gray)' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3" onKeyDown={handleKeyDown}>
          <div>
            <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
              链接采集
            </label>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={fetchUrl}
                onChange={e => setFetchUrl(e.target.value)}
                className="input-hand flex-1 font-hand"
                style={{ color: 'var(--ink-black)' }}
                placeholder="输入抖音/微信链接..."
              />
              <button
                onClick={async () => {
                  if (!fetchUrl.trim()) return
                  setIsFetching(true)
                  const result = await fetchContent(fetchUrl.trim())
                  setIsFetching(false)
                  if (result.success && result.data) {
                    setTitle(result.data.title)
                    setContent(result.data.content)
                    setSource(result.data.source as InspirationSource)
                    if (result.data.author) {
                      setTagsInput(result.data.author)
                    }
                    setFetchUrl('')
                  } else {
                    alert(result.error || '采集失败，请检查链接是否正确')
                  }
                }}
                disabled={isFetching || !fetchUrl.trim()}
                className="btn-hand-primary px-3 py-1.5 font-hand text-sm"
                style={{
                  color: 'white',
                  background: (isFetching || !fetchUrl.trim()) ? 'var(--ink-light)' : 'var(--accent-orange)',
                  opacity: (isFetching || !fetchUrl.trim()) ? 0.5 : 1,
                }}
              >
                {isFetching ? '采集中...' : '采集'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="input-hand w-full font-hand"
              style={{ color: 'var(--ink-black)' }}
              placeholder="灵感标题..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
              内容
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              className="input-hand w-full resize-none min-h-[100px] font-hand"
              style={{ color: 'var(--ink-black)' }}
              placeholder="写下你的灵感..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
              分类
            </label>
            <select
              value={categoryId || ''}
              onChange={e => setCategoryId(e.target.value || null)}
              className="input-hand w-full font-hand"
              style={{ color: 'var(--ink-black)' }}
            >
              <option value="">无分类</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
              标签
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={e => setTagsInput(e.target.value)}
              className="input-hand w-full font-hand"
              style={{ color: 'var(--ink-black)' }}
              placeholder="标签，逗号分隔"
            />
          </div>

          <button
            onClick={handleImportClipboard}
            className="btn-hand w-full flex items-center justify-center gap-2 font-hand text-sm"
            style={{ color: 'var(--accent-blue)' }}
          >
            <Icon name="document" size={16} />
            从剪贴板导入
          </button>
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '2px dashed var(--ink-light)' }}
        >
          <button
            onClick={onClose}
            className="btn-hand px-4 py-2 font-hand text-sm"
            style={{ color: 'var(--ink-gray)' }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={!title.trim() && !content.trim()}
            className="btn-hand-primary px-4 py-2 font-hand text-sm"
            style={{ color: 'white', background: 'var(--accent-orange)', opacity: (title.trim() || content.trim()) ? 1 : 0.5 }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function CategoryManager() {
  const store = useInspirationStickyStore()
  const categories = useInspirationStickyStore(s => s.categories)
  const items = useInspirationStickyStore(s => s.items)
  const selectedCategoryId = useInspirationStickyStore(s => s.selectedCategoryId)
  const [isCreating, setIsCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('folder')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const ICON_OPTIONS = ['folder', 'lightbulb', 'palette', 'note', 'music', 'image', 'search', 'globe', 'heart', 'fire', 'star', 'target']

  const getCategoryCount = (categoryId: string) => {
    return items.filter(i => i.categoryId === categoryId).length
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    await store.createCategory(newName.trim(), newIcon, newColor)
    setNewName('')
    setNewIcon('folder')
    setNewColor(CATEGORY_COLORS[0])
    setIsCreating(false)
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) return
    await store.renameCategory(id, editName.trim())
    setEditingId(null)
    setEditName('')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-hand font-semibold text-sm" style={{ color: 'var(--ink-black)' }}>
          分类
        </h3>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-1 rounded transition-colors"
          style={{ color: 'var(--accent-orange)' }}
        >
          <Icon name="plus" size={16} />
        </button>
      </div>

      {isCreating && (
        <div
          className="p-3 space-y-2"
          style={{
            background: 'var(--paper-texture)',
            border: 'var(--border-sketch)',
            borderRadius: 'var(--border-radius-md)',
            borderStyle: 'dashed',
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="input-hand w-full font-hand text-sm"
            style={{ color: 'var(--ink-black)' }}
            placeholder="分类名称"
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
          />
          <div className="flex flex-wrap gap-1">
            {ICON_OPTIONS.map(iconName => (
              <button
                key={iconName}
                onClick={() => setNewIcon(iconName)}
                className="w-7 h-7 flex items-center justify-center rounded transition-transform"
                style={{
                  background: newIcon === iconName ? 'var(--watercolor-yellow)' : 'transparent',
                  border: newIcon === iconName ? 'var(--border-sketch)' : '2px solid transparent',
                  borderRadius: 'var(--border-radius-sm)',
                  transform: newIcon === iconName ? 'scale(1.1)' : 'none',
                }}
              >
                <Icon name={iconName} size={16} />
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {CATEGORY_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setNewColor(color)}
                className="w-5 h-5 rounded-full transition-transform"
                style={{
                  backgroundColor: color,
                  border: newColor === color ? '2px solid var(--ink-black)' : '2px solid transparent',
                  transform: newColor === color ? 'scale(1.2)' : 'none',
                }}
              />
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setIsCreating(false); setNewName('') }}
              className="btn-hand px-2 py-1 font-hand text-xs"
              style={{ color: 'var(--ink-gray)' }}
            >
              取消
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="btn-hand-primary px-2 py-1 font-hand text-xs"
              style={{ color: 'white', background: 'var(--accent-orange)', opacity: newName.trim() ? 1 : 0.5 }}
            >
              创建
            </button>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer"
          onClick={() => store.selectCategory(null)}
          style={{
            borderRadius: 'var(--border-radius-sm)',
            background: selectedCategoryId === null ? 'var(--watercolor-yellow)' : 'transparent',
          }}
        >
          <Icon name="todo" size={16} />
          <span className="font-hand text-sm flex-1 truncate" style={{ color: 'var(--ink-black)' }}>全部</span>
          <span className="font-hand text-xs" style={{ color: 'var(--ink-light)' }}>{items.length}</span>
        </div>
        {categories.map(category => (
          <div
            key={category.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded transition-colors cursor-pointer group"
            onClick={() => store.selectCategory(category.id)}
            style={{
              borderRadius: 'var(--border-radius-sm)',
              background: selectedCategoryId === category.id ? 'var(--watercolor-yellow)' : 'transparent',
            }}
          >
            <Icon name={category.icon} size={16} />
            {editingId === category.id ? (
              <div className="flex items-center gap-1 flex-1">
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="input-hand flex-1 px-2 py-0.5 font-hand text-xs"
                  style={{ color: 'var(--ink-black)' }}
                  onKeyDown={e => { if (e.key === 'Enter') handleRename(category.id) }}
                  autoFocus
                />
                <button
                  onClick={e => { e.stopPropagation(); handleRename(category.id) }}
                  className="p-0.5"
                  style={{ color: 'var(--accent-green)' }}
                >
                  <Icon name="check" size={12} />
                </button>
              </div>
            ) : (
              <span
                className="font-hand text-sm flex-1 truncate"
                style={{ color: 'var(--ink-black)' }}
              >
                {category.name}
              </span>
            )}
            <span
              className="font-hand text-xs"
              style={{ color: 'var(--ink-light)' }}
            >
              {getCategoryCount(category.id)}
            </span>
            {editingId !== category.id && (
              <div className="hidden group-hover:flex items-center gap-0.5">
                <button
                  onClick={e => { e.stopPropagation(); setEditingId(category.id); setEditName(category.name) }}
                  className="p-0.5"
                  style={{ color: 'var(--ink-light)' }}
                >
                  <Icon name="edit" size={12} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); store.deleteCategory(category.id) }}
                  className="p-0.5"
                  style={{ color: 'var(--accent-red)' }}
                >
                  <Icon name="delete" size={12} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function InspirationDetailModal({ item, onClose }: { item: InspirationStickyNote; onClose: () => void }) {
  const store = useInspirationStickyStore()
  const sourceConfig = SOURCE_CONFIG[item.source]
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(item.title)
  const [editContent, setEditContent] = useState(item.content)
  const [editTags, setEditTags] = useState(item.tags.join(', '))

  const handleSave = async () => {
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    await store.updateItem(item.id, {
      title: editTitle.trim() || '未命名灵感',
      content: editContent.trim(),
      tags,
    })
    setIsEditing(false)
  }

  const handleDelete = async () => {
    await store.deleteItem(item.id)
    onClose()
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    } catch {
      return dateStr
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full max-w-lg mx-4 animate-fade-in"
        style={{
          background: 'var(--paper-bg)',
          border: 'var(--border-sketch)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-sketch)',
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '2px dashed var(--ink-light)' }}
        >
          <div className="flex items-center gap-2">
            <span
              className="tag-hand text-xs"
              style={{ background: sourceConfig.color, color: 'white', borderColor: sourceConfig.color }}
            >
              {sourceConfig.label}
            </span>
            {item.isFavorite && (
              <Icon name="star" size={14} style={{ color: 'var(--accent-orange)' }} />
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded transition-colors" style={{ color: 'var(--ink-gray)' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {isEditing ? (
            <>
              <div>
                <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
                  标题
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="input-hand w-full font-hand"
                  style={{ color: 'var(--ink-black)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
                  内容
                </label>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="input-hand w-full resize-none min-h-[120px] font-hand"
                  style={{ color: 'var(--ink-black)' }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>
                  标签
                </label>
                <input
                  type="text"
                  value={editTags}
                  onChange={e => setEditTags(e.target.value)}
                  className="input-hand w-full font-hand"
                  style={{ color: 'var(--ink-black)' }}
                  placeholder="标签，逗号分隔"
                />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold font-hand leading-snug" style={{ color: 'var(--ink-black)' }}>
                {item.title}
              </h2>

              {item.content && (
                <p className="font-hand text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--ink-gray)' }}>
                  {item.content}
                </p>
              )}

              {item.coverImage && (
                <div className="rounded overflow-hidden" style={{ border: 'var(--border-sketch)' }}>
                  <img
                    src={item.coverImage}
                    alt={item.title}
                    className="w-full max-h-64 object-cover"
                    style={{ borderRadius: 'var(--border-radius-sm)' }}
                  />
                </div>
              )}

              {(item.sourceAuthor || item.sourceUrl) && (
                <div className="flex items-center gap-2">
                  {item.sourceAuthor && (
                    <span className="font-hand text-sm" style={{ color: 'var(--ink-light)' }}>
                      作者：{item.sourceAuthor}
                    </span>
                  )}
                  {item.sourceUrl && (
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-hand text-sm transition-colors"
                      style={{ color: 'var(--accent-blue)' }}
                    >
                      <Icon name="link" size={14} />
                      查看来源
                    </a>
                  )}
                </div>
              )}

              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {item.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="tag-hand text-xs"
                      style={{ color: 'var(--ink-gray)' }}
                    >
                      <Icon name="tag" size={10} className="inline mr-0.5" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="font-hand text-xs" style={{ color: 'var(--ink-light)' }}>
                创建于 {formatDate(item.createdAt)}
              </div>
            </>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-3 px-6 py-4"
          style={{ borderTop: '2px dashed var(--ink-light)' }}
        >
          {isEditing ? (
            <>
              <button
                onClick={() => {
                  setIsEditing(false)
                  setEditTitle(item.title)
                  setEditContent(item.content)
                  setEditTags(item.tags.join(', '))
                }}
                className="btn-hand px-4 py-2 font-hand text-sm"
                style={{ color: 'var(--ink-gray)' }}
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="btn-hand-primary px-4 py-2 font-hand text-sm"
                style={{ color: 'white', background: 'var(--accent-orange)' }}
              >
                保存
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleDelete}
                className="btn-hand px-4 py-2 font-hand text-sm"
                style={{ color: 'var(--accent-red)' }}
              >
                <Icon name="delete" size={14} className="inline mr-1" />
                删除
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-hand-primary px-4 py-2 font-hand text-sm"
                style={{ color: 'white', background: 'var(--accent-orange)' }}
              >
                <Icon name="edit" size={14} className="inline mr-1" />
                编辑
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function InspirationStickyBoard() {
  const store = useInspirationStickyStore()
  const items = useInspirationStickyStore(s => s.items)
  const isLoading = useInspirationStickyStore(s => s.isLoading)
  const searchQuery = useInspirationStickyStore(s => s.searchQuery)
  const selectedCategoryId = useInspirationStickyStore(s => s.selectedCategoryId)
  const [isQuickCaptureOpen, setIsQuickCaptureOpen] = useState(false)
  const [quickCaptureSource, setQuickCaptureSource] = useState<InspirationSource>('manual')
  const [visibleCount, setVisibleCount] = useState(20)
  const [detailItem, setDetailItem] = useState<InspirationStickyNote | null>(null)

  useEffect(() => {
    store.loadAll()
  }, [])

  const sortedItems = useMemo(() => {
    return store.getFilteredItems().sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
      return b.updatedAt.localeCompare(a.updatedAt)
    })
  }, [items, searchQuery, selectedCategoryId])

  const visibleItems = sortedItems.slice(0, visibleCount)
  const hasMore = visibleCount < sortedItems.length

  const handleOpenQuickCapture = (source: InspirationSource = 'manual') => {
    setQuickCaptureSource(source)
    setIsQuickCaptureOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 font-hand" style={{ color: 'var(--ink-light)' }}>
        加载中...
      </div>
    )
  }

  return (
    <div className="flex gap-4 h-full">
      <div
        className="shrink-0 p-4 overflow-y-auto"
        style={{
          width: '200px',
          background: 'var(--paper-texture)',
          border: 'var(--border-sketch)',
          borderRadius: 'var(--border-radius-lg)',
        }}
      >
        <CategoryManager />
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-hand" style={{ color: 'var(--ink-black)' }}>
            灵感便签
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenQuickCapture('manual')}
              className="btn-hand-primary flex items-center gap-2 px-4 py-2 font-hand"
              style={{ color: 'white', background: 'var(--accent-orange)' }}
            >
              <Icon name="plus" size={16} />
              快速采集
            </button>
            <button
              onClick={() => handleOpenQuickCapture('manual')}
              className="btn-hand flex items-center gap-2 px-4 py-2 font-hand"
              style={{ border: 'var(--border-sketch)', borderRadius: 'var(--border-radius-md)' }}
            >
              <Icon name="edit" size={16} /> 记录便签
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 flex-1 min-w-[200px]">
            <Icon name="search" size={16} className="shrink-0" style={{ color: 'var(--ink-light)' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => store.setFilter(e.target.value)}
              className="input-hand flex-1 font-hand text-sm"
              style={{ color: 'var(--ink-black)' }}
              placeholder="搜索灵感便签..."
            />
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <div className="text-center py-12 font-hand" style={{ color: 'var(--ink-light)' }}>
            <p className="text-lg mb-2">还没有内容</p>
            <p className="text-sm">点击「快速采集」或「记录便签」开始记录</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {visibleItems.map(item => (
                <InspirationCard key={item.id} item={item} onOpenDetail={setDetailItem} />
              ))}
            </div>

            {hasMore && (
              <div className="text-center py-4">
                <button
                  onClick={() => setVisibleCount(prev => prev + 20)}
                  className="btn-hand font-hand"
                  style={{ padding: '8px 24px', color: 'var(--accent-orange)' }}
                >
                  加载更多
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <QuickCapture isOpen={isQuickCaptureOpen} onClose={() => setIsQuickCaptureOpen(false)} defaultSource={quickCaptureSource} />
      {detailItem && (
        <InspirationDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      )}
    </div>
  )
}

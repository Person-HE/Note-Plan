import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Highlight from '@tiptap/extension-highlight'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Underline from '@tiptap/extension-underline'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import Link from '@tiptap/extension-link'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import {
  Plus, Trash2, Edit3, ChevronDown, ChevronRight,
  FolderOpen, Folder, FileText, BookOpen, ArrowLeft, Save,
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Highlighter, Code, Quote, Minus,
  Link2, GitBranch, ArrowRight, Indent as IndentIcon, Outdent as OutdentIcon,
  Table as TableIcon, Image as ImageIcon, AlignLeft, AlignCenter, AlignRight, AlignJustify, Superscript as SuperscriptIcon, Subscript as SubscriptIcon, Link2 as LinkIcon, Palette,
  Rows3, Columns3, Trash2 as TrashIcon,
} from 'lucide-react'
import { Icon } from '@/shared/Icons'
import { useNoteStore } from './store'
import { cn, debounce } from '@/shared'
import type { DocMeta, KnowledgeBase, Folder as FolderType, DocLink, DocLinkType, GraphNode, GraphEdge, ManualRelation } from './types'

function RichTextEditor({ content, onChange }: { content: string; onChange: (html: string) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '开始写作... 使用 [[文档名]] 创建跨文档链接' }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Underline,
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Superscript,
      Subscript,
      Link.configure({ openOnClick: false }),
      TextStyle,
      Color,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [tableRows, setTableRows] = useState(3)
  const [tableCols, setTableCols] = useState(3)
  const [showImageDialog, setShowImageDialog] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')

  if (!editor) return null

  const toolbarButtons = [
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), title: '加粗' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), title: '斜体' },
    { icon: UnderlineIcon, action: () => editor.chain().focus().toggleUnderline().run(), active: editor.isActive('underline'), title: '下划线' },
    { icon: Strikethrough, action: () => editor.chain().focus().toggleStrike().run(), active: editor.isActive('strike'), title: '删除线' },
    { sep: true },
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: editor.isActive('heading', { level: 1 }), title: '标题1' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), title: '标题2' },
    { icon: Heading3, action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), title: '标题3' },
    { sep: true },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), title: '无序列表' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), title: '有序列表' },
    { icon: CheckSquare, action: () => editor.chain().focus().toggleTaskList().run(), active: editor.isActive('taskList'), title: '任务列表' },
    { icon: IndentIcon, action: () => editor.chain().focus().sinkListItem('listItem').run(), active: false, title: '增加缩进' },
    { icon: OutdentIcon, action: () => editor.chain().focus().liftListItem('listItem').run(), active: false, title: '减少缩进' },
    { sep: true },
    { icon: Highlighter, action: () => editor.chain().focus().toggleHighlight().run(), active: editor.isActive('highlight'), title: '高亮' },
    { icon: Code, action: () => editor.chain().focus().toggleCodeBlock().run(), active: editor.isActive('codeBlock'), title: '代码块' },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: editor.isActive('blockquote'), title: '引用' },
    { icon: Minus, action: () => editor.chain().focus().setHorizontalRule().run(), active: false, title: '分割线' },
    { sep: true },
    { icon: TableIcon, action: () => setShowTableDialog(!showTableDialog), active: false, title: '插入表格' },
    { icon: Rows3, action: () => editor.chain().focus().addRowAfter().run(), active: false, title: '添加行' },
    { icon: Columns3, action: () => editor.chain().focus().addColumnAfter().run(), active: false, title: '添加列' },
    { icon: Trash2, action: () => editor.chain().focus().deleteTable().run(), active: false, title: '删除表格' },
    { icon: ImageIcon, action: () => setShowImageDialog(!showImageDialog), active: false, title: '插入图片' },
    { sep: true },
    { icon: AlignLeft, action: () => editor.chain().focus().setTextAlign('left').run(), active: editor.isActive({ textAlign: 'left' }), title: '左对齐' },
    { icon: AlignCenter, action: () => editor.chain().focus().setTextAlign('center').run(), active: editor.isActive({ textAlign: 'center' }), title: '居中' },
    { icon: AlignRight, action: () => editor.chain().focus().setTextAlign('right').run(), active: editor.isActive({ textAlign: 'right' }), title: '右对齐' },
    { icon: AlignJustify, action: () => editor.chain().focus().setTextAlign('justify').run(), active: editor.isActive({ textAlign: 'justify' }), title: '两端对齐' },
    { sep: true },
    { icon: SuperscriptIcon, action: () => editor.chain().focus().toggleSuperscript().run(), active: editor.isActive('superscript'), title: '上标' },
    { icon: SubscriptIcon, action: () => editor.chain().focus().toggleSubscript().run(), active: editor.isActive('subscript'), title: '下标' },
    { icon: LinkIcon, action: () => setShowLinkDialog(!showLinkDialog), active: editor.isActive('link'), title: '插入链接' },
    { icon: Palette, action: () => setShowColorPicker(!showColorPicker), active: showColorPicker, title: '文字颜色' },
  ]

  return (
    <div className="card-hand" style={{ padding: 0, overflow: 'hidden' }}>
      <div className="flex flex-wrap items-center gap-0.5 px-3 py-2" style={{ borderBottom: '2px dashed var(--ink-light)', background: 'var(--paper-texture)' }}>
        {toolbarButtons.map((btn, i) => {
          if ('sep' in btn && btn.sep) {
            return <div key={i} style={{ width: '1px', height: '20px', background: 'var(--ink-light)', margin: '0 4px' }} />
          }
          const b = btn as { icon: React.ComponentType<{ size?: number }>; action: () => void; active: boolean; title: string }
          return (
            <button
              key={i}
              onClick={b.action}
              title={b.title}
              style={{
                padding: '4px 8px',
                minHeight: '28px',
                fontSize: '0.8rem',
                background: b.active ? 'var(--accent-orange)' : 'transparent',
                color: b.active ? 'white' : 'var(--ink-black)',
                border: b.active ? '2px solid var(--ink-black)' : '2px solid transparent',
                borderRadius: 'var(--border-radius-sm)',
                transition: 'all 0.15s',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={e => { if (!b.active) e.currentTarget.style.background = 'var(--watercolor-yellow)' }}
              onMouseLeave={e => { if (!b.active) e.currentTarget.style.background = 'transparent' }}
            >
              <b.icon size={15} />
            </button>
          )
        })}
      </div>
      {showColorPicker && (
        <div
          className="flex flex-wrap gap-1 px-3 py-2"
          style={{
            borderBottom: '2px dashed var(--ink-light)',
            background: 'var(--paper-texture)',
          }}
        >
          {['#000000', '#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280', '#ffffff'].map(color => (
            <button
              key={color}
              onClick={() => {
                editor.chain().focus().setColor(color).run()
                setShowColorPicker(false)
              }}
              style={{
                width: '24px',
                height: '24px',
                backgroundColor: color,
                border: '2px solid var(--ink-black)',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
              }}
              title={color}
            />
          ))}
          <button
            onClick={() => {
              editor.chain().focus().unsetColor().run()
              setShowColorPicker(false)
            }}
            style={{
              padding: '2px 8px',
              fontSize: '0.75rem',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              background: 'var(--paper-bg)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hand)',
            }}
          >
            默认
          </button>
        </div>
      )}
      {showTableDialog && (
        <div
          className="flex items-center gap-3 px-3 py-2"
          style={{
            borderBottom: '2px dashed var(--ink-light)',
            background: 'var(--paper-texture)',
          }}
        >
          <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)' }}>行数</span>
          <input
            type="number"
            min={1}
            max={10}
            value={tableRows}
            onChange={e => setTableRows(Number(e.target.value))}
            style={{ width: '40px', padding: '2px 4px', border: '2px solid var(--ink-black)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center', fontFamily: 'var(--font-hand)' }}
          />
          <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)' }}>列数</span>
          <input
            type="number"
            min={1}
            max={10}
            value={tableCols}
            onChange={e => setTableCols(Number(e.target.value))}
            style={{ width: '40px', padding: '2px 4px', border: '2px solid var(--ink-black)', borderRadius: 'var(--border-radius-sm)', textAlign: 'center', fontFamily: 'var(--font-hand)' }}
          />
          <button
            onClick={() => {
              editor.chain().focus().insertTable({ rows: tableRows, cols: tableCols, withHeaderRow: true }).run()
              setShowTableDialog(false)
              setTableRows(3)
              setTableCols(3)
            }}
            style={{
              padding: '2px 12px',
              fontSize: '0.8rem',
              background: 'var(--accent-orange)',
              color: 'white',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hand)',
            }}
          >
            插入
          </button>
          <button
            onClick={() => setShowTableDialog(false)}
            style={{
              padding: '2px 8px',
              fontSize: '0.8rem',
              background: 'var(--paper-bg)',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hand)',
            }}
          >
            取消
          </button>
        </div>
      )}
      {showImageDialog && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            borderBottom: '2px dashed var(--ink-light)',
            background: 'var(--paper-texture)',
          }}
        >
          <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)' }}>图片URL</span>
          <input
            type="url"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            placeholder="https://..."
            style={{
              flex: 1,
              padding: '2px 8px',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              fontFamily: 'var(--font-hand)',
              fontSize: '0.85rem',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && imageUrl.trim()) {
                editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
                setShowImageDialog(false)
                setImageUrl('')
              }
            }}
          />
          <button
            onClick={() => {
              if (imageUrl.trim()) {
                editor.chain().focus().setImage({ src: imageUrl.trim() }).run()
                setShowImageDialog(false)
                setImageUrl('')
              }
            }}
            style={{
              padding: '2px 12px',
              fontSize: '0.8rem',
              background: 'var(--accent-orange)',
              color: 'white',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hand)',
            }}
          >
            插入
          </button>
          <button
            onClick={() => { setShowImageDialog(false); setImageUrl('') }}
            style={{
              padding: '2px 8px',
              fontSize: '0.8rem',
              background: 'var(--paper-bg)',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hand)',
            }}
          >
            取消
          </button>
        </div>
      )}
      {showLinkDialog && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{
            borderBottom: '2px dashed var(--ink-light)',
            background: 'var(--paper-texture)',
          }}
        >
          <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)' }}>链接URL</span>
          <input
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            placeholder="https://..."
            style={{
              flex: 1,
              padding: '2px 8px',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              fontFamily: 'var(--font-hand)',
              fontSize: '0.85rem',
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && linkUrl.trim()) {
                editor.chain().focus().setLink({ href: linkUrl.trim() }).run()
                setShowLinkDialog(false)
                setLinkUrl('')
              }
            }}
          />
          <button
            onClick={() => {
              if (linkUrl.trim()) {
                editor.chain().focus().setLink({ href: linkUrl.trim() }).run()
                setShowLinkDialog(false)
                setLinkUrl('')
              }
            }}
            style={{
              padding: '2px 12px',
              fontSize: '0.8rem',
              background: 'var(--accent-orange)',
              color: 'white',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hand)',
            }}
          >
            插入
          </button>
          {editor.isActive('link') && (
            <button
              onClick={() => {
                editor.chain().focus().unsetLink().run()
                setShowLinkDialog(false)
                setLinkUrl('')
              }}
              style={{
                padding: '2px 8px',
                fontSize: '0.8rem',
                background: 'var(--accent-red)',
                color: 'white',
                border: '2px solid var(--ink-black)',
                borderRadius: 'var(--border-radius-sm)',
                cursor: 'pointer',
                fontFamily: 'var(--font-hand)',
              }}
            >
              移除链接
            </button>
          )}
          <button
            onClick={() => { setShowLinkDialog(false); setLinkUrl('') }}
            style={{
              padding: '2px 8px',
              fontSize: '0.8rem',
              background: 'var(--paper-bg)',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-sm)',
              cursor: 'pointer',
              fontFamily: 'var(--font-hand)',
            }}
          >
            取消
          </button>
        </div>
      )}
      <EditorContent
        editor={editor}
        className="font-hand tiptap-hand-editor"
        style={{
          minHeight: '400px',
          padding: '1rem 1.25rem',
          color: 'var(--ink-black)',
          background: 'var(--paper-bg)',
        }}
      />
    </div>
  )
}

function BacklinkPanel({ backlinks, onNavigate }: { backlinks: DocLink[]; onNavigate: (docId: string) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (backlinks.length === 0) return null

  const store = useNoteStore()
  const getSourceTitle = (docId: string) => {
    for (const kb of store.knowledgeBases) {
      for (const f of kb.folders) {
        const doc = f.docs.find(d => d.id === docId)
        if (doc) return doc.title || '无标题'
      }
    }
    return '未知文档'
  }

  const typeLabels: Record<DocLinkType, string> = {
    reference: '引用',
    related: '关联',
    depends_on: '依赖',
    extends: '扩展',
    contradicts: '反驳',
  }

  return (
    <div style={{ borderTop: '2px dashed var(--ink-light)', paddingTop: '1rem', marginTop: '1rem' }}>
      <button onClick={() => setIsCollapsed(!isCollapsed)} className="flex items-center gap-2 w-full font-hand text-sm font-bold" style={{ color: 'var(--ink-black)' }}>
        <Link2 size={14} style={{ color: 'var(--accent-blue)' }} />
        反向链接 ({backlinks.length})
        {isCollapsed ? <ChevronRight size={14} style={{ color: 'var(--ink-light)' }} /> : <ChevronDown size={14} style={{ color: 'var(--ink-light)' }} />}
      </button>
      {!isCollapsed && (
        <div className="mt-2 space-y-1">
          {backlinks.map(link => (
            <div key={link.id} className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group" style={{ borderRadius: 'var(--border-radius-sm)', transition: 'background 0.15s' }}
              onClick={() => onNavigate(link.sourceDocId)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--watercolor-blue)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <FileText size={14} style={{ color: 'var(--accent-blue)' }} />
              <span className="flex-1 text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>{getSourceTitle(link.sourceDocId)}</span>
              <span className="tag-hand text-xs">{typeLabels[link.type]}</span>
              <button onClick={e => { e.stopPropagation(); store.removeDocLink(link.id) }} className="btn-hand opacity-0 group-hover:opacity-100" style={{ padding: '1px 4px', minHeight: '18px', color: 'var(--accent-red)', transition: 'opacity 0.15s' }}>
                <Trash2 size={10} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function KnowledgeGraph({ nodes, edges, onNodeClick, onDeleteManualRelation }: { nodes: GraphNode[]; edges: GraphEdge[]; onNodeClick: (id: string) => void; onDeleteManualRelation?: (id: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 400 })

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setDimensions({ width: entry.contentRect.width, height: entry.contentRect.height })
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const positions = useRef<Map<string, { x: number; y: number }>>(new Map())

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    ctx.scale(dpr, dpr)

    const cx = dimensions.width / 2
    const cy = dimensions.height / 2
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35

    if (positions.current.size === 0 || !nodes.every(n => positions.current.has(n.id))) {
      positions.current.clear()
      nodes.forEach((node, i) => {
        const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2
        positions.current.set(node.id, {
          x: cx + radius * Math.cos(angle),
          y: cy + radius * Math.sin(angle),
        })
      })
    }

    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    for (const edge of edges) {
      const from = positions.current.get(edge.source)
      const to = positions.current.get(edge.target)
      if (!from || !to) continue

      const isManual = edge.type === 'manual'
      const isHovered = isManual && hoveredEdge === edge.manualRelationId

      ctx.beginPath()
      ctx.moveTo(from.x, from.y)
      ctx.lineTo(to.x, to.y)

      if (isManual) {
        ctx.strokeStyle = isHovered ? '#ea580c' : '#f59e0b'
        ctx.lineWidth = isHovered ? 2.5 : 1.5
        ctx.setLineDash([6, 4])
      } else {
        ctx.strokeStyle = edge.type === 'reference' ? '#3b82f6' : edge.type === 'related' ? '#f97316' : '#94a3b8'
        ctx.lineWidth = 1
        ctx.setLineDash(edge.type === 'contains' ? [] : [4, 4])
      }
      ctx.stroke()
      ctx.setLineDash([])

      if (isManual && edge.label) {
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        ctx.save()
        ctx.font = '11px Arial, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        const textWidth = ctx.measureText(edge.label).width
        ctx.fillStyle = '#fffbeb'
        ctx.fillRect(midX - textWidth / 2 - 4, midY - 8, textWidth + 8, 16)
        ctx.strokeStyle = '#f59e0b'
        ctx.lineWidth = 1
        ctx.strokeRect(midX - textWidth / 2 - 4, midY - 8, textWidth + 8, 16)
        ctx.fillStyle = '#92400e'
        ctx.fillText(edge.label, midX, midY)
        ctx.restore()
      }

      if (isManual && isHovered && edge.manualRelationId) {
        const midX = (from.x + to.x) / 2
        const midY = (from.y + to.y) / 2
        ctx.save()
        ctx.beginPath()
        ctx.arc(midX + 20, midY - 12, 8, 0, 2 * Math.PI)
        ctx.fillStyle = '#ef4444'
        ctx.fill()
        ctx.fillStyle = 'white'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('×', midX + 20, midY - 12)
        ctx.restore()
      }
    }

    for (const node of nodes) {
      const pos = positions.current.get(node.id)
      if (!pos) continue

      const isHovered = hoveredNode === node.id
      const nodeRadius = isHovered ? 24 : 18

      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeRadius, 0, 2 * Math.PI)
      ctx.fillStyle = node.type === 'doc' ? '#f97316' : '#3b82f6'
      ctx.fill()
      ctx.strokeStyle = isHovered ? '#1e293b' : '#64748b'
      ctx.lineWidth = isHovered ? 3 : 1.5
      ctx.stroke()

      ctx.fillStyle = '#1e293b'
      ctx.font = `${isHovered ? '13' : '11'}px Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const label = node.label.length > 8 ? node.label.slice(0, 8) + '…' : node.label
      ctx.fillText(label, pos.x, pos.y + nodeRadius + 4)

      if (node.linkCount > 0) {
        ctx.fillStyle = '#ef4444'
        ctx.beginPath()
        ctx.arc(pos.x + nodeRadius * 0.7, pos.y - nodeRadius * 0.7, 8, 0, 2 * Math.PI)
        ctx.fill()
        ctx.fillStyle = 'white'
        ctx.font = '9px sans-serif'
        ctx.textBaseline = 'middle'
        ctx.fillText(String(node.linkCount), pos.x + nodeRadius * 0.7, pos.y - nodeRadius * 0.7)
      }
    }
  }, [nodes, edges, dimensions, hoveredNode, hoveredEdge])

  const findEdgeAtPoint = useCallback((x: number, y: number): GraphEdge | null => {
    for (const edge of edges) {
      if (edge.type !== 'manual') continue
      const from = positions.current.get(edge.source)
      const to = positions.current.get(edge.target)
      if (!from || !to) continue
      const midX = (from.x + to.x) / 2
      const midY = (from.y + to.y) / 2
      const dist = Math.sqrt((x - midX) ** 2 + (y - midY) ** 2)
      if (dist < 15) return edge
    }
    return null
  }, [edges])

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clickedEdge = findEdgeAtPoint(x, y)
    if (clickedEdge && clickedEdge.manualRelationId && onDeleteManualRelation) {
      onDeleteManualRelation(clickedEdge.manualRelationId)
      return
    }

    for (const node of nodes) {
      const pos = positions.current.get(node.id)
      if (!pos) continue
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      if (dist < 24) {
        onNodeClick(node.id)
        return
      }
    }
  }

  const handleCanvasMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const nearEdge = findEdgeAtPoint(x, y)
    if (nearEdge && nearEdge.manualRelationId) {
      setHoveredEdge(nearEdge.manualRelationId)
      setHoveredNode(null)
      if (canvasRef.current) canvasRef.current.style.cursor = 'pointer'
      return
    }
    setHoveredEdge(null)

    for (const node of nodes) {
      const pos = positions.current.get(node.id)
      if (!pos) continue
      const dist = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      if (dist < 24) {
        setHoveredNode(node.id)
        if (canvasRef.current) canvasRef.current.style.cursor = 'pointer'
        return
      }
    }
    setHoveredNode(null)
    if (canvasRef.current) canvasRef.current.style.cursor = 'default'
  }

  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <GitBranch size={48} style={{ color: 'var(--ink-light)' }} className="mb-4" />
        <p className="font-hand text-lg" style={{ color: 'var(--ink-gray)' }}>暂无知识图谱</p>
        <p className="text-sm font-hand mt-1" style={{ color: 'var(--ink-light)' }}>在文档中使用 [[文档名]] 语法创建链接后，图谱将自动生成</p>
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '400px', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => { setHoveredNode(null); setHoveredEdge(null) }}
      />
    </div>
  )
}

export function KnowledgeBaseView() {
  const store = useNoteStore()
  const knowledgeBases = useNoteStore(s => s.knowledgeBases)
  const editingDocId = useNoteStore(s => s.editingDocId)
  const [showGraph, setShowGraph] = useState(false)
  const [expandedKbs, setExpandedKbs] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [creatingKb, setCreatingKb] = useState(false)
  const [kbName, setKbName] = useState('')
  const [creatingFolderKbId, setCreatingFolderKbId] = useState<string | null>(null)
  const [folderName, setFolderName] = useState('')
  const [renamingKbId, setRenamingKbId] = useState<string | null>(null)
  const [renameKbValue, setRenameKbValue] = useState('')
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameFolderValue, setRenameFolderValue] = useState('')

  if (editingDocId) {
    return <NoteEditor />
  }

  if (showGraph) {
    return <GraphView onBack={() => setShowGraph(false)} />
  }

  const toggleKb = (id: string) => { setExpandedKbs(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  const toggleFolder = (id: string) => { setExpandedFolders(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  const handleCreateKb = async () => { if (!kbName.trim()) return; await store.createKnowledgeBase({ name: kbName.trim() }); setKbName(''); setCreatingKb(false) }
  const handleCreateFolder = async (kbId: string) => { if (!folderName.trim()) return; await store.createFolder(kbId, folderName.trim()); setFolderName(''); setCreatingFolderKbId(null) }
  const handleRenameKb = async (id: string) => { if (!renameKbValue.trim()) return; await store.renameKnowledgeBase(id, renameKbValue.trim()); setRenamingKbId(null); setRenameKbValue('') }
  const handleRenameFolder = async (id: string) => { if (!renameFolderValue.trim()) return; await store.renameFolder(id, renameFolderValue.trim()); setRenamingFolderId(null); setRenameFolderValue('') }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-hand text-xl font-bold" style={{ color: 'var(--ink-black)' }}>知识库</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => { store.loadGraph(); setShowGraph(true) }} className="btn-hand" style={{ padding: '4px 12px', fontSize: '0.9rem', color: 'var(--accent-blue)' }}>
            <GitBranch size={16} /> 关系图谱
          </button>
          <button onClick={() => setCreatingKb(true)} className="btn-hand btn-hand-primary" style={{ padding: '4px 12px', fontSize: '0.9rem' }}>
            <Plus size={16} />新建知识库
          </button>
        </div>
      </div>

      {creatingKb && (
        <div className="card-hand flex items-center gap-2">
          <input value={kbName} onChange={e => setKbName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateKb(); if (e.key === 'Escape') setCreatingKb(false) }} placeholder="知识库名称" className="input-hand" style={{ flex: 1 }} autoFocus />
          <button onClick={handleCreateKb} className="btn-hand btn-hand-primary" style={{ padding: '4px 12px', fontSize: '0.85rem' }}>确定</button>
          <button onClick={() => { setCreatingKb(false); setKbName('') }} className="btn-hand" style={{ padding: '4px 12px', fontSize: '0.85rem' }}>取消</button>
        </div>
      )}

      {knowledgeBases.length === 0 && !creatingKb ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen size={40} style={{ color: 'var(--ink-light)' }} className="mb-4" />
          <p className="font-hand" style={{ color: 'var(--ink-gray)' }}>还没有知识库，点击上方按钮创建</p>
        </div>
      ) : (
        <div className="space-y-2">
          {knowledgeBases.map(kb => (
            <div key={kb.id} className="card-hand" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="flex items-center gap-2 px-4 py-3 cursor-pointer" onClick={() => toggleKb(kb.id)} style={{ transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-texture)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {expandedKbs.has(kb.id) ? <ChevronDown size={16} style={{ color: 'var(--ink-light)' }} /> : <ChevronRight size={16} style={{ color: 'var(--ink-light)' }} />}
              <span className="text-lg"><Icon name={kb.icon || 'folder'} size={18} /></span>
                {renamingKbId === kb.id ? (
                  <input value={renameKbValue} onChange={e => setRenameKbValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameKb(kb.id); if (e.key === 'Escape') setRenamingKbId(null) }} onClick={e => e.stopPropagation()} className="input-hand" style={{ flex: 1, fontSize: '0.9rem', padding: '2px 8px' }} autoFocus />
                ) : (
                  <span className="flex-1 font-medium font-hand" style={{ color: 'var(--ink-black)' }}>{kb.name}</span>
                )}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {renamingKbId !== kb.id && (
                    <>
                      <button onClick={() => { setCreatingFolderKbId(kb.id); setFolderName('') }} className="btn-hand" style={{ padding: '2px 6px', minHeight: '24px', color: 'var(--accent-orange)' }} title="新建文件夹"><Plus size={14} /></button>
                      <button onClick={() => { setRenamingKbId(kb.id); setRenameKbValue(kb.name) }} className="btn-hand" style={{ padding: '2px 6px', minHeight: '24px', color: 'var(--accent-blue)' }} title="重命名"><Edit3 size={14} /></button>
                      <button onClick={() => store.deleteKnowledgeBase(kb.id)} className="btn-hand" style={{ padding: '2px 6px', minHeight: '24px', color: 'var(--accent-red)' }} title="删除"><Trash2 size={14} /></button>
                    </>
                  )}
                  {renamingKbId === kb.id && (
                    <>
                      <button onClick={() => handleRenameKb(kb.id)} className="btn-hand btn-hand-primary" style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: '24px' }}>确定</button>
                      <button onClick={() => setRenamingKbId(null)} className="btn-hand" style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: '24px' }}>取消</button>
                    </>
                  )}
                </div>
              </div>
              {expandedKbs.has(kb.id) && (
                <div style={{ borderTop: '2px dashed var(--ink-light)' }}>
                  {creatingFolderKbId === kb.id && (
                    <div className="flex items-center gap-2 px-8 py-2" style={{ background: 'var(--paper-texture)' }}>
                      <Folder size={14} style={{ color: 'var(--ink-light)' }} />
                      <input value={folderName} onChange={e => setFolderName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateFolder(kb.id); if (e.key === 'Escape') setCreatingFolderKbId(null) }} placeholder="文件夹名称" className="input-hand" style={{ flex: 1, fontSize: '0.85rem', padding: '2px 8px' }} autoFocus />
                      <button onClick={() => handleCreateFolder(kb.id)} className="btn-hand btn-hand-primary" style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: '24px' }}>确定</button>
                      <button onClick={() => setCreatingFolderKbId(null)} className="btn-hand" style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: '24px' }}>取消</button>
                    </div>
                  )}
                  {kb.folders.length === 0 && creatingFolderKbId !== kb.id ? (
                    <p className="px-8 py-3 text-sm font-hand" style={{ color: 'var(--ink-light)' }}>暂无文件夹</p>
                  ) : (
                    kb.folders.map(folder => (
                      <div key={folder.id}>
                        <div className="flex items-center gap-2 px-8 py-2 cursor-pointer" onClick={() => toggleFolder(folder.id)} style={{ transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-texture)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                          {expandedFolders.has(folder.id) ? <FolderOpen size={14} style={{ color: 'var(--accent-orange)' }} /> : <Folder size={14} style={{ color: 'var(--accent-orange)' }} />}
                          {renamingFolderId === folder.id ? (
                            <input value={renameFolderValue} onChange={e => setRenameFolderValue(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleRenameFolder(folder.id); if (e.key === 'Escape') setRenamingFolderId(null) }} onClick={e => e.stopPropagation()} className="input-hand" style={{ flex: 1, fontSize: '0.85rem', padding: '2px 8px' }} autoFocus />
                          ) : (
                            <span className="flex-1 text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>{folder.name}</span>
                          )}
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {renamingFolderId !== folder.id && (
                              <>
                                <button onClick={() => store.createDoc(kb.id, folder.id)} className="btn-hand" style={{ padding: '2px 6px', minHeight: '22px', color: 'var(--accent-orange)' }} title="新建文档"><Plus size={12} /></button>
                                <button onClick={() => { setRenamingFolderId(folder.id); setRenameFolderValue(folder.name) }} className="btn-hand" style={{ padding: '2px 6px', minHeight: '22px', color: 'var(--accent-blue)' }} title="重命名"><Edit3 size={12} /></button>
                                <button onClick={() => store.deleteFolder(folder.id)} className="btn-hand" style={{ padding: '2px 6px', minHeight: '22px', color: 'var(--accent-red)' }} title="删除"><Trash2 size={12} /></button>
                              </>
                            )}
                            {renamingFolderId === folder.id && (
                              <>
                                <button onClick={() => handleRenameFolder(folder.id)} className="btn-hand btn-hand-primary" style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: '22px' }}>确定</button>
                                <button onClick={() => setRenamingFolderId(null)} className="btn-hand" style={{ padding: '2px 8px', fontSize: '0.75rem', minHeight: '22px' }}>取消</button>
                              </>
                            )}
                          </div>
                        </div>
                        {expandedFolders.has(folder.id) && folder.docs.length > 0 && (
                          <div className="pl-12 pr-4">
                            {folder.docs.map(doc => (
                              <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 cursor-pointer group" style={{ borderRadius: 'var(--border-radius-sm)', transition: 'background 0.15s' }}
                                onClick={() => store.openDoc(doc.id)}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--paper-texture)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                                <FileText size={14} style={{ color: 'var(--ink-light)' }} />
                                <span className="flex-1 text-sm font-hand line-clamp-1" style={{ color: 'var(--ink-gray)' }}>
                                  {doc.title || '无标题文档'}
                                </span>
                                {doc.chunkCount > 0 && <span className="text-[10px] font-hand" style={{ color: 'var(--ink-light)' }}>{doc.chunkCount}块</span>}
                                {(doc.outgoingLinkCount + doc.incomingLinkCount) > 0 && <span className="text-[10px] font-hand flex items-center gap-0.5" style={{ color: 'var(--accent-blue)' }}><Icon name="link" size={10} />{(doc.outgoingLinkCount + doc.incomingLinkCount)}</span>}
                                <button onClick={e => { e.stopPropagation(); store.deleteDoc(doc.id) }} className="btn-hand opacity-0 group-hover:opacity-100" style={{ padding: '1px 4px', minHeight: '18px', color: 'var(--accent-red)', transition: 'opacity 0.15s' }}>
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function GraphView({ onBack }: { onBack: () => void }) {
  const store = useNoteStore()
  const graphNodes = useNoteStore(s => s.graphNodes)
  const graphEdges = useNoteStore(s => s.graphEdges)
  const manualRelations = useNoteStore(s => s.manualRelations)
  const [showAddRelation, setShowAddRelation] = useState(false)
  const [sourceId, setSourceId] = useState('')
  const [targetId, setTargetId] = useState('')
  const [relationLabel, setRelationLabel] = useState('关联')

  useEffect(() => { store.loadGraph() }, [])

  const handleNodeClick = (docId: string) => {
    store.openDoc(docId)
  }

  const handleDeleteManualRelation = (id: string) => {
    store.removeManualRelation(id)
  }

  const handleAddRelation = () => {
    if (!sourceId || !targetId || sourceId === targetId) return
    store.addManualRelation({
      sourceId,
      targetId,
      label: relationLabel.trim() || '关联',
    })
    setShowAddRelation(false)
    setSourceId('')
    setTargetId('')
    setRelationLabel('关联')
  }

  const getNodeTitle = (id: string) => {
    const node = graphNodes.find(n => n.id === id)
    return node ? node.label : '未知'
  }

  return (
    <div className="space-y-4 overflow-y-auto">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="btn-hand" style={{ padding: '4px 8px', minHeight: '32px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-hand text-xl font-bold" style={{ color: 'var(--ink-black)' }}>知识关系图谱</h2>
        <button onClick={() => setShowAddRelation(true)} className="btn-hand btn-hand-primary ml-auto" style={{ padding: '4px 12px', fontSize: '0.85rem' }}>
          <Plus size={14} /> 添加关系
        </button>
      </div>

      {showAddRelation && (
        <div className="card-hand" style={{ padding: '1rem' }}>
          <h3 className="font-hand text-sm font-bold mb-3" style={{ color: 'var(--ink-black)' }}>添加手动关系</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)', minWidth: '60px' }}>源文档</span>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="input-hand"
                style={{ flex: 1, fontSize: '0.85rem', padding: '4px 8px' }}
              >
                <option value="">选择源文档</option>
                {graphNodes.filter(n => n.type === 'doc').map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)', minWidth: '60px' }}>目标文档</span>
              <select
                value={targetId}
                onChange={e => setTargetId(e.target.value)}
                className="input-hand"
                style={{ flex: 1, fontSize: '0.85rem', padding: '4px 8px' }}
              >
                <option value="">选择目标文档</option>
                {graphNodes.filter(n => n.type === 'doc').map(n => (
                  <option key={n.id} value={n.id}>{n.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-hand text-xs" style={{ color: 'var(--ink-gray)', minWidth: '60px' }}>关系标签</span>
              <input
                value={relationLabel}
                onChange={e => setRelationLabel(e.target.value)}
                placeholder="关联"
                className="input-hand"
                style={{ flex: 1, fontSize: '0.85rem', padding: '4px 8px' }}
              />
            </div>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={handleAddRelation}
                disabled={!sourceId || !targetId || sourceId === targetId}
                className="btn-hand btn-hand-primary"
                style={{ padding: '4px 12px', fontSize: '0.85rem', opacity: (!sourceId || !targetId || sourceId === targetId) ? 0.5 : 1 }}
              >
                保存
              </button>
              <button
                onClick={() => { setShowAddRelation(false); setSourceId(''); setTargetId(''); setRelationLabel('关联') }}
                className="btn-hand"
                style={{ padding: '4px 12px', fontSize: '0.85rem' }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card-hand" style={{ padding: '1rem' }}>
        <KnowledgeGraph nodes={graphNodes} edges={graphEdges} onNodeClick={handleNodeClick} onDeleteManualRelation={handleDeleteManualRelation} />
      </div>
      <div className="card-hand" style={{ padding: '1rem' }}>
        <h3 className="font-hand text-sm font-bold mb-2" style={{ color: 'var(--ink-gray)' }}>文档列表</h3>
        <div className="space-y-1">
          {graphNodes.map(node => (
            <div key={node.id} className="flex items-center gap-2 px-2 py-1 cursor-pointer" style={{ borderRadius: 'var(--border-radius-sm)', transition: 'background 0.15s' }}
              onClick={() => handleNodeClick(node.id)}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--watercolor-yellow)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <span>{node.type === 'doc' ? <Icon name="document" size={14} /> : <Icon name="note-edit" size={14} />}</span>
              <span className="flex-1 text-sm font-hand" style={{ color: 'var(--ink-black)' }}>{node.label}</span>
              {node.linkCount > 0 && <span className="tag-hand text-xs" style={{ background: 'var(--watercolor-blue)' }}><Icon name="link" size={10} /> {node.linkCount}</span>}
              {node.tags.length > 0 && node.tags.map(t => <span key={t} className="tag-hand text-xs">{t}</span>)}
            </div>
          ))}
        </div>
      </div>
      {manualRelations.length > 0 && (
        <div className="card-hand" style={{ padding: '1rem' }}>
          <h3 className="font-hand text-sm font-bold mb-2" style={{ color: 'var(--ink-gray)' }}>手动关系</h3>
          <div className="space-y-1">
            {manualRelations.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 group" style={{ borderRadius: 'var(--border-radius-sm)', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--watercolor-yellow)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <span className="text-sm font-hand" style={{ color: 'var(--ink-black)' }}>{getNodeTitle(r.sourceId)}</span>
                <ArrowRight size={12} style={{ color: '#f59e0b' }} />
                <span className="tag-hand text-xs" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }}>{r.label}</span>
                <ArrowRight size={12} style={{ color: '#f59e0b' }} />
                <span className="text-sm font-hand" style={{ color: 'var(--ink-black)' }}>{getNodeTitle(r.targetId)}</span>
                <button onClick={() => handleDeleteManualRelation(r.id)} className="btn-hand ml-auto opacity-0 group-hover:opacity-100" style={{ padding: '1px 4px', minHeight: '18px', color: 'var(--accent-red)', transition: 'opacity 0.15s' }}>
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function NoteEditor() {
  const store = useNoteStore()
  const editingDocId = useNoteStore(s => s.editingDocId)
  const editingDocTitle = useNoteStore(s => s.editingDocTitle)
  const editingDocTags = useNoteStore(s => s.editingDocTags)
  const editingDocContent = useNoteStore(s => s.editingDocContent)
  const editingDocBacklinks = useNoteStore(s => s.editingDocBacklinks)

  const [title, setTitle] = useState(editingDocTitle)
  const [tagInput, setTagInput] = useState('')
  const titleRef = useRef(title)
  titleRef.current = title

  useEffect(() => { setTitle(editingDocTitle) }, [editingDocTitle])

  const debouncedSave = useCallback(
    debounce((t: string, c: string, tags: string[]) => {
      store.saveDoc(t, c, tags)
    }, 1000),
    [editingDocId]
  )

  const handleContentChange = (html: string) => {
    debouncedSave(titleRef.current, html, store.editingDocTags)
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    debouncedSave(newTitle, store.editingDocContent, store.editingDocTags)
  }

  const handleAddTag = () => {
    const tag = tagInput.trim()
    if (!tag || editingDocTags.includes(tag)) return
    const newTags = [...editingDocTags, tag]
    store.saveDoc(title, editingDocContent, newTags)
    setTagInput('')
  }

  const handleRemoveTag = (tag: string) => {
    const newTags = editingDocTags.filter(t => t !== tag)
    store.saveDoc(title, editingDocContent, newTags)
  }

  const handleNavigateBacklink = (docId: string) => {
    store.openDoc(docId)
  }

  if (!editingDocId) return null

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => store.closeDoc()} className="btn-hand" style={{ padding: '4px 8px', minHeight: '32px' }}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="font-hand text-lg font-semibold" style={{ color: 'var(--ink-black)' }}>编辑文档</h2>
        <Save size={16} style={{ color: 'var(--ink-light)' }} className="ml-auto" />
        <span className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>自动保存</span>
      </div>

      <input
        value={title}
        onChange={e => handleTitleChange(e.target.value)}
        placeholder="文档标题"
        className="input-hand"
        style={{ fontSize: '1.1rem', fontWeight: 600, padding: '0.5rem 1rem' }}
      />

      <RichTextEditor content={editingDocContent} onChange={handleContentChange} />

      <div className="space-y-2" style={{ borderTop: '2px dashed var(--ink-light)', paddingTop: '1rem' }}>
        <div className="flex items-center gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
            placeholder="添加标签，回车确认"
            className="input-hand"
            style={{ flex: 1, fontSize: '0.9rem' }}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {editingDocTags.map(tag => (
            <span key={tag} className="tag-hand cursor-pointer" style={{ background: 'var(--watercolor-yellow)' }} onClick={() => handleRemoveTag(tag)}>
              {tag}<span style={{ marginLeft: '4px', color: 'var(--ink-light)' }}>×</span>
            </span>
          ))}
        </div>
      </div>

      <BacklinkPanel backlinks={editingDocBacklinks} onNavigate={handleNavigateBacklink} />
    </div>
  )
}

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Plus, Star, MoreHorizontal, Trash2, Edit3, Flag, Calendar,
  Clock, ChevronRight, ChevronDown, GripVertical, Copy,
  ArrowRight, AlertTriangle, CheckCircle2, Circle, Timer,
  FolderOpen, Link2, RotateCcw
} from 'lucide-react'
import { useTaskStore } from './store'
import type { Task, TaskStatus, Priority } from './types'
import { cn, PRIORITY_CONFIG, STATUS_CONFIG, formatRelativeDate, formatTime, isOverdue, isDueToday, formatMinutes, calculateBufferTime, useVirtualScroll } from '@/shared'
import { Button, Badge, ProgressRing, ProgressBar, Modal, Input, TextArea, Select, Checkbox, ColorPicker, Tooltip, EmptyState } from '@/shared/components'
import { GROUP_COLORS } from '@/shared'
import { Icon } from '@/shared/Icons'

export function TaskItem({
  task,
  depth = 0,
  onSelect,
  isSelected,
}: {
  task: Task
  depth?: number
  onSelect: (id: string) => void
  isSelected?: boolean
}) {
  const store = useTaskStore()
  const [showSubtasks, setShowSubtasks] = useState(true)
  const [showMenu, setShowMenu] = useState(false)
  const subtasks = useTaskStore(s => s.tasks.filter(t => t.parentId === task.id))
  const hasSubtasks = subtasks.length > 0
  const priorityConfig = PRIORITY_CONFIG[task.priority]
  const overdue = isOverdue(task.dueDate)
  const dueToday = isDueToday(task.dueDate)

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (task.status === 'completed') {
      store.uncompleteTask(task.id)
    } else {
      store.completeTask(task.id)
    }
  }

  const handleProgressClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect(task.id)
  }

  return (
    <>
      <div
        className={cn(
          'card-hand group flex items-start gap-2 px-3 py-2.5 cursor-pointer transition-all duration-150',
          isSelected && 'ring-1',
          task.status === 'completed' && 'opacity-60',
          task.isMigrated && 'border-l-2',
          depth > 0 && 'ml-6 border-l pl-4',
        )}
        style={{
          ...(isSelected ? { background: 'rgba(255, 200, 150, 0.15)', ringColor: 'var(--accent-orange)' } : {}),
          ...(task.isMigrated ? { borderLeftColor: 'var(--accent-red)' } : {}),
          ...(depth > 0 ? { borderLeftColor: 'var(--border-sketch)' } : {}),
          borderRadius: 'var(--border-radius-md)',
        }}
        onClick={() => onSelect(task.id)}
      >
        <div className="flex items-center gap-2 pt-0.5 shrink-0">
          {hasSubtasks && (
            <button
              onClick={(e) => { e.stopPropagation(); setShowSubtasks(!showSubtasks) }}
              className="p-0.5 transition-colors"
              style={{ color: 'var(--ink-light)' }}
            >
              {showSubtasks ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!hasSubtasks && depth > 0 && <div className="w-[22px]" />}
          <button
            onClick={handleToggleComplete}
            className={cn(
              'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300 shrink-0',
            )}
            style={{
              borderColor: task.status === 'completed'
                ? 'var(--accent-green)'
                : task.status === 'in_progress'
                  ? 'var(--accent-orange)'
                  : 'var(--ink-black)',
              background: task.status === 'completed'
                ? 'var(--accent-green)'
                : task.status === 'in_progress'
                  ? 'rgba(255, 200, 150, 0.15)'
                  : 'transparent',
            }}
          >
            {task.status === 'completed' && <CheckCircle2 size={14} style={{ color: 'white' }} />}
            {task.status === 'in_progress' && task.progress > 0 && (
              <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent-orange)' }} />
            )}
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium truncate font-hand',
                task.status === 'completed' && 'line-through',
              )}
              style={{
                color: task.status === 'completed' ? 'var(--ink-light)' : 'var(--ink-black)',
              }}
            >
              {task.title}
            </span>
            {task.isImportant && <Star size={14} className="shrink-0" style={{ color: 'var(--accent-orange)', fill: 'var(--accent-orange)' }} />}
            {task.isRecurring && <RotateCcw size={12} className="shrink-0" style={{ color: 'var(--accent-orange)' }} />}
          </div>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="tag-hand text-xs px-1.5 py-0.5 font-hand"
              style={{
                background: priorityConfig.bgColor,
                color: priorityConfig.color,
              }}
            >
              {priorityConfig.label}
            </span>
            {task.startDate && (
              <span
                className="flex items-center gap-1 text-xs font-hand"
                style={{ color: 'var(--ink-light)' }}
              >
                <Calendar size={11} />
                开始 {formatRelativeDate(task.startDate)}
                {task.startTime && ` ${task.startTime}`}
              </span>
            )}
            {task.dueDate && (
              <span
                className="flex items-center gap-1 text-xs font-hand"
                style={{
                  color: overdue ? 'var(--accent-red)' : dueToday ? 'var(--accent-orange)' : 'var(--ink-light)',
                  fontWeight: (overdue || dueToday) ? 'medium' : 'normal',
                }}
              >
                <Calendar size={11} />
                {formatRelativeDate(task.dueDate)}
                {task.dueTime && ` ${task.dueTime}`}
              </span>
            )}
            {task.estimatedMinutes > 0 && (
              <span className="flex items-center gap-1 text-xs font-hand" style={{ color: 'var(--ink-light)' }}>
                <Timer size={11} />
                {formatMinutes(task.estimatedMinutes)}
                {calculateBufferTime(task.estimatedMinutes) > 0 && (
                  <span style={{ color: 'var(--accent-green)' }}>(+{calculateBufferTime(task.estimatedMinutes)}min缓冲)</span>
                )}
              </span>
            )}
            {hasSubtasks && (
              <span className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>
                {subtasks.filter(s => s.status === 'completed').length}/{subtasks.length} 子任务
              </span>
            )}
          </div>

          {task.status === 'in_progress' && task.progress > 0 && task.progress < 100 && (
            <div className="mt-2" onClick={handleProgressClick}>
              <ProgressBar progress={task.progress} height="h-1.5" />
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <Tooltip content={task.isImportant ? '取消重要' : '标记重要'}>
            <button
              onClick={(e) => { e.stopPropagation(); store.setTaskImportant(task.id, !task.isImportant) }}
              className="p-1 rounded transition-colors"
              style={{
                color: task.isImportant ? 'var(--accent-orange)' : 'var(--ink-light)',
              }}
            >
              <Star size={14} className={task.isImportant ? 'fill-current' : ''} />
            </button>
          </Tooltip>
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
              className="p-1 rounded transition-colors"
              style={{ color: 'var(--ink-light)' }}
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <TaskMenu
                task={task}
                onClose={() => setShowMenu(false)}
              />
            )}
          </div>
        </div>

        {task.progress > 0 && task.progress < 100 && (
          <div className="shrink-0" onClick={handleProgressClick}>
            <ProgressRing progress={task.progress} size={32} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {hasSubtasks && showSubtasks && (
        <div>
          {subtasks.map(sub => (
            <TaskItem key={sub.id} task={sub} depth={depth + 1} onSelect={onSelect} isSelected={isSelected} />
          ))}
        </div>
      )}
    </>
  )
}

function TaskMenu({ task, onClose }: { task: Task; onClose: () => void }) {
  const store = useTaskStore()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={menuRef}
      className="card-hand absolute right-0 top-full mt-1 z-20 w-48 py-1 animate-fade-in"
      style={{
        background: 'var(--paper-bg)',
        border: 'var(--border-sketch)',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: 'var(--shadow-sketch)',
      }}
    >
      <button
        onClick={() => { store.setSelectedTaskId(task.id); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-hand"
        style={{ color: 'var(--ink-gray)' }}
      >
        <Edit3 size={14} /> 编辑
      </button>
      <button
        onClick={() => { store.updateTask(task.id, { isRecurring: !task.isRecurring }); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-hand"
        style={{ color: 'var(--ink-gray)' }}
      >
        <RotateCcw size={14} /> {task.isRecurring ? '取消循环' : '设为循环'}
      </button>
      <button
        onClick={() => { store.createTask({ title: task.title + ' (副本)', parentId: task.parentId, groupId: task.groupId }); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-hand"
        style={{ color: 'var(--ink-gray)' }}
      >
        <Copy size={14} /> 复制
      </button>
      <div className="my-1" style={{ borderTop: '1px solid var(--border-sketch)' }} />
      <button
        onClick={() => { store.deleteTask(task.id); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-hand"
        style={{ color: 'var(--accent-red)' }}
      >
        <Trash2 size={14} /> 删除
      </button>
    </div>
  )
}

export function TaskList() {
  const store = useTaskStore()
  const tasks = useTaskStore(s => s.getFilteredTasks())
  const selectedTaskId = useTaskStore(s => s.selectedTaskId)

  const handleSelect = (id: string) => {
    store.setSelectedTaskId(store.selectedTaskId === id ? null : id)
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<CheckCircle2 size={48} />}
        title="暂无任务"
        description="点击上方按钮创建你的第一个待办事项"
        action={
          <Button onClick={() => store.setSelectedTaskId('__new__')}>
            <Plus size={16} /> 创建任务
          </Button>
        }
      />
    )
  }

  if (tasks.length > 50) {
    return <VirtualTaskList tasks={tasks} selectedTaskId={selectedTaskId} onSelect={handleSelect} />
  }

  return (
    <div className="space-y-0.5">
      {tasks.map(task => (
        <TaskItem
          key={task.id}
          task={task}
          onSelect={handleSelect}
          isSelected={selectedTaskId === task.id}
        />
      ))}
    </div>
  )
}

function VirtualTaskList({ tasks, selectedTaskId, onSelect }: { tasks: Task[]; selectedTaskId: string | null; onSelect: (id: string) => void }) {
  const ITEM_HEIGHT = 52
  const { containerRef, totalHeight, visibleItems, handleScroll } = useVirtualScroll({ itemCount: tasks.length, itemHeight: ITEM_HEIGHT })

  return (
    <div ref={containerRef} onScroll={handleScroll} style={{ height: '100%', overflowY: 'auto', position: 'relative' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ index, offsetTop }) => (
          <div key={tasks[index].id} style={{ position: 'absolute', top: offsetTop, left: 0, right: 0, height: ITEM_HEIGHT }}>
            <TaskItem task={tasks[index]} onSelect={onSelect} isSelected={selectedTaskId === tasks[index].id} />
          </div>
        ))}
      </div>
    </div>
  )
}

export function QuickAddTask({ defaultDueDate }: { defaultDueDate?: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const store = useTaskStore()

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSubmit = async () => {
    if (!title.trim()) return
    await store.createTask({ title: title.trim(), dueDate: defaultDueDate || null })
    setTitle('')
    setIsOpen(false)
  }

  if (!isOpen) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setIsOpen(true)} className="w-full justify-start font-hand" style={{ color: 'var(--ink-light)' }}>
        <Plus size={16} /> 添加任务
      </Button>
    )
  }

  return (
    <div
      className="card-hand flex items-center gap-2 p-2"
      style={{
        background: 'var(--paper-bg)',
        borderRadius: 'var(--border-radius-md)',
      }}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit()
          if (e.key === 'Escape') { setIsOpen(false); setTitle('') }
        }}
        placeholder="输入任务名称，按回车添加..."
        className="input-hand flex-1 text-sm font-hand"
        style={{ color: 'var(--ink-black)', background: 'transparent' }}
      />
      <Button size="sm" onClick={handleSubmit} disabled={!title.trim()}>添加</Button>
      <Button size="sm" variant="ghost" onClick={() => { setIsOpen(false); setTitle('') }}>取消</Button>
    </div>
  )
}

export function TaskDetailPanel() {
  const store = useTaskStore()
  const task = useTaskStore(s => s.tasks.find(t => t.id === s.selectedTaskId))
  const isNew = useTaskStore(s => s.selectedTaskId === '__new__')
  const groups = useTaskStore(s => s.groups)
  const subtasks = useTaskStore(s => s.tasks.filter(t => t.parentId === s.selectedTaskId))

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as Priority,
    groupId: '' as string,
    startDate: '',
    startTime: '',
    dueDate: '',
    dueTime: '',
    estimatedMinutes: 0,
    isImportant: false,
    isRecurring: false,
  })
  const [newSubtask, setNewSubtask] = useState('')

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        groupId: task.groupId ?? '',
        startDate: task.startDate ?? '',
        startTime: task.startTime ?? '',
        dueDate: task.dueDate ?? '',
        dueTime: task.dueTime ?? '',
        estimatedMinutes: task.estimatedMinutes,
        isImportant: task.isImportant,
        isRecurring: task.isRecurring,
      })
    } else if (isNew) {
      setForm({
        title: '', description: '', priority: 'medium', groupId: '',
        startDate: '', startTime: '', dueDate: '', dueTime: '', estimatedMinutes: 0,
        isImportant: false, isRecurring: false,
      })
    }
  }, [task, isNew])

  if (!task && !isNew) return null

  const handleSave = async () => {
    if (!form.title.trim()) return
    if (isNew) {
      await store.createTask({
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        groupId: form.groupId || null,
        startDate: form.startDate || null,
        startTime: form.startTime || null,
        dueDate: form.dueDate || null,
        dueTime: form.dueTime || null,
        estimatedMinutes: form.estimatedMinutes,
        isImportant: form.isImportant,
        isRecurring: form.isRecurring,
      })
    } else if (task) {
      await store.updateTask(task.id, {
        title: form.title.trim(),
        description: form.description,
        priority: form.priority,
        groupId: form.groupId || null,
        startDate: form.startDate || null,
        startTime: form.startTime || null,
        dueDate: form.dueDate || null,
        dueTime: form.dueTime || null,
        estimatedMinutes: form.estimatedMinutes,
        isImportant: form.isImportant,
        isRecurring: form.isRecurring,
      })
    }
    store.setSelectedTaskId(null)
  }

  const handleAddSubtask = async () => {
    if (!newSubtask.trim() || !task) return
    await store.createTask({ title: newSubtask.trim(), parentId: task.id })
    setNewSubtask('')
  }

  const handleProgressChange = (progress: number) => {
    if (task) store.updateProgress(task.id, progress)
  }

  return (
    <div
      className="card-hand h-full flex flex-col animate-slide-in"
      style={{
        background: 'var(--paper-bg)',
        borderLeft: 'var(--border-sketch)',
      }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--border-sketch)' }}
      >
        <h3 className="text-sm font-semibold font-hand" style={{ color: 'var(--ink-black)' }}>
          {isNew ? '新建任务' : '编辑任务'}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => store.setSelectedTaskId(null)}><Icon name="close" size={14} /></Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <Input
          label="任务名称"
          value={form.title}
          onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="输入任务名称..."
        />

        <TextArea
          label="描述"
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="添加详细描述（支持Markdown）..."
          rows={3}
        />

        <div className="grid grid-cols-2 gap-3">
          <Select
            label="优先级"
            value={form.priority}
            onChange={(v) => setForm(f => ({ ...f, priority: v as Priority }))}
            options={[
              { label: '紧急', value: 'urgent', color: '#ef4444' },
              { label: '高', value: 'high', color: '#f97316' },
              { label: '中', value: 'medium', color: '#3b82f6' },
              { label: '低', value: 'low', color: '#94a3b8' },
            ]}
          />
          <Select
            label="分组"
            value={form.groupId}
            onChange={(v) => setForm(f => ({ ...f, groupId: v }))}
            options={[
              { label: '无分组', value: '' },
              ...groups.map(g => ({ label: g.name, value: g.id, color: g.color })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="开始日期"
            type="date"
            value={form.startDate}
            onChange={(e) => setForm(f => ({ ...f, startDate: e.target.value }))}
          />
          <Input
            label="开始时间"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm(f => ({ ...f, startTime: e.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="截止日期"
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))}
          />
          <Input
            label="截止时间"
            type="time"
            value={form.dueTime}
            onChange={(e) => setForm(f => ({ ...f, dueTime: e.target.value }))}
          />
        </div>

        <Input
          label="预估时长（分钟）"
          type="number"
          value={form.estimatedMinutes || ''}
          onChange={(e) => setForm(f => ({ ...f, estimatedMinutes: parseInt(e.target.value) || 0 }))}
          placeholder="0"
        />
        {form.estimatedMinutes > 0 && (
          <p className="text-xs font-hand" style={{ color: 'var(--accent-green)' }}>
            <Icon name="lightbulb" size={14} style={{ color: 'var(--accent-orange)' }} /> 系统已自动预留 {calculateBufferTime(form.estimatedMinutes)} 分钟缓冲时间
          </p>
        )}

        <div className="flex items-center gap-4">
          <Checkbox
            checked={form.isImportant}
            onChange={(v) => setForm(f => ({ ...f, isImportant: v }))}
            label="标记为重要"
          />
          <Checkbox
            checked={form.isRecurring}
            onChange={(v) => setForm(f => ({ ...f, isRecurring: v }))}
            label="循环任务"
          />
        </div>

        {task && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium font-hand" style={{ color: 'var(--ink-gray)' }}>
                完成进度: {task.progress}%
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={task.progress}
                onChange={(e) => handleProgressChange(parseInt(e.target.value))}
                className="w-full"
                style={{ accentColor: 'var(--accent-orange)' }}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium font-hand" style={{ color: 'var(--ink-gray)' }}>子任务</label>
              {subtasks.map(sub => (
                <div key={sub.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => store.completeTask(sub.id)}
                    className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                    style={{
                      borderColor: sub.status === 'completed' ? 'var(--accent-green)' : 'var(--border-sketch)',
                      background: sub.status === 'completed' ? 'var(--accent-green)' : 'transparent',
                    }}
                  >
                    {sub.status === 'completed' && <CheckCircle2 size={10} style={{ color: 'white' }} />}
                  </button>
                  <span
                    className={cn('text-sm flex-1 font-hand', sub.status === 'completed' && 'line-through')}
                    style={{ color: sub.status === 'completed' ? 'var(--ink-light)' : 'var(--ink-black)' }}
                  >
                    {sub.title}
                  </span>
                  <button
                    onClick={() => store.deleteTask(sub.id)}
                    className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--accent-red)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                  placeholder="添加子任务..."
                  className="input-hand flex-1 text-sm font-hand pb-1"
                  style={{
                    background: 'transparent',
                    borderBottom: '1px solid var(--border-sketch)',
                    color: 'var(--ink-black)',
                  }}
                />
                <Button size="sm" variant="ghost" onClick={handleAddSubtask} disabled={!newSubtask.trim()}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>

            {task.createdAt && (
              <div
                className="text-xs space-y-1 pt-2 font-hand"
                style={{ color: 'var(--ink-light)', borderTop: '1px solid var(--border-sketch)' }}
              >
                <p>创建时间: {task.createdAt}</p>
                {task.startedAt && <p>开始时间: {task.startedAt}</p>}
                {task.completedAt && <p>完成时间: {task.completedAt}</p>}
                {task.actualMinutes > 0 && <p>实际耗时: {formatMinutes(task.actualMinutes)}</p>}
              </div>
            )}
          </>
        )}
      </div>

      <div
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{ borderTop: '1px solid var(--border-sketch)' }}
      >
        <Button variant="ghost" size="sm" onClick={() => store.setSelectedTaskId(null)}>取消</Button>
        <Button size="sm" onClick={handleSave} disabled={!form.title.trim()}>
          {isNew ? '创建' : '保存'}
        </Button>
      </div>
    </div>
  )
}

export function GroupManager() {
  const store = useTaskStore()
  const groups = useTaskStore(s => s.groups)
  const [isCreating, setIsCreating] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(GROUP_COLORS[0])

  const handleCreate = async () => {
    if (!name.trim()) return
    await store.createGroup({ name: name.trim(), color, icon: 'folder' })
    setName('')
    setColor(GROUP_COLORS[0])
    setIsCreating(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider font-hand" style={{ color: 'var(--ink-light)' }}>分组</h4>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="p-1 transition-colors"
          style={{ color: 'var(--ink-light)' }}
        >
          <Plus size={14} />
        </button>
      </div>

      {isCreating && (
        <div
          className="card-hand space-y-2 p-2"
          style={{
            background: 'var(--paper-bg)',
            borderRadius: 'var(--border-radius-md)',
          }}
        >
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="分组名称" />
          <ColorPicker colors={GROUP_COLORS} selected={color} onChange={setColor} />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate} disabled={!name.trim()}>创建</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>取消</Button>
          </div>
        </div>
      )}

      <div className="space-y-0.5">
        {groups.map(group => (
          <div
            key={group.id}
            className="flex items-center gap-2 px-2 py-1.5 cursor-pointer group transition-colors"
            style={{ borderRadius: 'var(--border-radius-md)' }}
            onClick={() => store.setFilter({ groupId: group.id })}
          >
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: group.color }} />
            <span className="text-sm flex-1 truncate font-hand" style={{ color: 'var(--ink-gray)' }}>{group.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); store.deleteGroup(group.id) }}
              className="p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: 'var(--accent-red)' }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TaskFilterBar() {
  const store = useTaskStore()
  const filter = useTaskStore(s => s.filter)
  const sort = useTaskStore(s => s.sort)
  const groups = useTaskStore(s => s.groups)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupColor, setNewGroupColor] = useState(GROUP_COLORS[0])

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    await store.createGroup({ name: newGroupName.trim(), color: newGroupColor, icon: 'folder' })
    setNewGroupName('')
    setNewGroupColor(GROUP_COLORS[0])
    setShowNewGroup(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={filter.status?.[0] ?? ''}
          onChange={(v) => store.setFilter({ status: v ? [v as TaskStatus] : undefined })}
          placeholder="全部状态"
          options={[
            { label: '全部状态', value: '' },
            { label: '待办', value: 'pending' },
            { label: '进行中', value: 'in_progress' },
            { label: '已完成', value: 'completed' },
            { label: '已取消', value: 'cancelled' },
          ]}
        />
        <Select
          value={filter.priority?.[0] ?? ''}
          onChange={(v) => store.setFilter({ priority: v ? [v as Priority] : undefined })}
          placeholder="全部优先级"
          options={[
            { label: '全部优先级', value: '' },
            { label: '紧急', value: 'urgent' },
            { label: '高', value: 'high' },
            { label: '中', value: 'medium' },
            { label: '低', value: 'low' },
          ]}
        />
        <Select
          value={filter.groupId ?? ''}
          onChange={(v) => store.setFilter({ groupId: v || undefined })}
          placeholder="全部分组"
          options={[
            { label: '全部分组', value: '' },
            ...groups.map(g => ({ label: g.name, value: g.id })),
          ]}
        />
        <Select
          value={sort.field}
          onChange={(v) => store.setSort({ ...sort, field: v as TaskSort['field'] })}
          placeholder="排序方式"
          options={[
            { label: '默认排序', value: 'order' },
            { label: '按优先级', value: 'priority' },
            { label: '按截止日期', value: 'dueDate' },
            { label: '按创建时间', value: 'createdAt' },
            { label: '按进度', value: 'progress' },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setShowNewGroup(!showNewGroup)}>
          <Plus size={14} /> 新建分组
        </Button>
        {(filter.status || filter.priority || filter.groupId) && (
          <Button variant="ghost" size="sm" onClick={() => store.setFilter({ status: undefined, priority: undefined, groupId: undefined })}>
            清除筛选
          </Button>
        )}
      </div>
      {showNewGroup && (
        <div
          className="card-hand flex items-center gap-2 p-3"
          style={{
            background: 'var(--paper-bg)',
            borderRadius: 'var(--border-radius-md)',
          }}
        >
          <Input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="输入分组名称"
            className="w-40"
          />
          <ColorPicker colors={GROUP_COLORS} selected={newGroupColor} onChange={setNewGroupColor} />
          <Button size="sm" onClick={handleCreateGroup} disabled={!newGroupName.trim()}>创建</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowNewGroup(false)}>取消</Button>
        </div>
      )}
    </div>
  )
}

type TaskSort = { field: 'createdAt' | 'dueDate' | 'priority' | 'order' | 'title' | 'progress'; direction: 'asc' | 'desc' }

import React, { useState, useRef } from 'react'
import { Icon } from '@/shared/Icons'
import { cn, formatFileSize } from '@/shared'
import { Button, Input } from '@/shared/components'
import { useAttachmentStore } from './store'
import type { Attachment } from './types'

const TYPE_ICONS: Record<Attachment['type'], React.ReactNode> = {
  file: <Icon name="document" size={16} />,
  link: <Icon name="link" size={16} />,
  image: <Icon name="image" size={16} />,
  local_path: <Icon name="folder-open" size={16} />,
}

export function AttachmentItem({
  attachment,
  onDelete,
}: {
  attachment: Attachment
  onDelete?: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-surface-50 dark:hover:bg-surface-800/50 group transition-colors">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
        attachment.type === 'image' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
        attachment.type === 'link' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
        attachment.type === 'local_path' ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400' :
        'bg-surface-100 text-surface-600 dark:bg-surface-700 dark:text-surface-400'
      )}>
        {TYPE_ICONS[attachment.type]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
          {attachment.name}
        </div>
        <div className="text-xs text-surface-500 dark:text-surface-400">
          {attachment.size > 0 ? formatFileSize(attachment.size) : attachment.type}
        </div>
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {attachment.type === 'link' && (
          <a
            href={attachment.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 rounded text-surface-400 hover:text-primary-500 transition-colors"
          >
            <Icon name="link" size={14} />
          </a>
        )}
        {onDelete && (
          <button
            onClick={() => onDelete(attachment.id)}
            className="p-1 rounded text-surface-400 hover:text-red-500 transition-colors"
          >
            <Icon name="delete" size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export function AttachmentList({
  taskId,
}: {
  taskId: string
}) {
  const store = useAttachmentStore()
  const attachments = useAttachmentStore(s => s.getAttachmentsByTask(taskId))

  if (attachments.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-surface-400 dark:text-surface-500">
        <Icon name="paperclip" size={20} className="mx-auto mb-1 opacity-50" />
        暂无附件
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {attachments.map(attachment => (
        <AttachmentItem
          key={attachment.id}
          attachment={attachment}
          onDelete={(id) => store.removeAttachment(id)}
        />
      ))}
    </div>
  )
}

export function AttachmentUploader({
  taskId,
  onClose,
}: {
  taskId: string
  onClose?: () => void
}) {
  const store = useAttachmentStore()
  const [mode, setMode] = useState<'file' | 'link' | 'local_path'>('file')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkName, setLinkName] = useState('')
  const [localPath, setLocalPath] = useState('')
  const [localName, setLocalName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isImage = file.type.startsWith('image/')
    await store.addAttachment({
      taskId,
      type: isImage ? 'image' : 'file',
      name: file.name,
      url: URL.createObjectURL(file),
      size: file.size,
    })
    onClose?.()
  }

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return
    await store.addAttachment({
      taskId,
      type: 'link',
      name: linkName.trim() || linkUrl,
      url: linkUrl.trim(),
      size: 0,
    })
    setLinkUrl('')
    setLinkName('')
    onClose?.()
  }

  const handleAddLocalPath = async () => {
    if (!localPath.trim()) return
    await store.addAttachment({
      taskId,
      type: 'local_path',
      name: localName.trim() || localPath,
      url: localPath.trim(),
      size: 0,
    })
    setLocalPath('')
    setLocalName('')
    onClose?.()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1">
        {(['file', 'link', 'local_path'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
              mode === m
                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800'
            )}
          >
            {m === 'file' ? '文件' : m === 'link' ? '链接' : '本地路径'}
          </button>
        ))}
      </div>

      {mode === 'file' && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
          >
            <Icon name="upload" size={14} /> 选择文件
          </Button>
        </div>
      )}

      {mode === 'link' && (
        <div className="space-y-2">
          <Input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="输入链接地址..."
          />
          <Input
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            placeholder="链接名称（可选）"
          />
          <Button size="sm" onClick={handleAddLink} disabled={!linkUrl.trim()} className="w-full">
            <Icon name="link" size={14} /> 添加链接
          </Button>
        </div>
      )}

      {mode === 'local_path' && (
        <div className="space-y-2">
          <Input
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="输入本地路径，如 /Users/xxx/file.txt"
          />
          <Input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="显示名称（可选）"
          />
          <Button size="sm" onClick={handleAddLocalPath} disabled={!localPath.trim()} className="w-full">
            <Icon name="folder-open" size={14} /> 添加本地路径
          </Button>
        </div>
      )}
    </div>
  )
}

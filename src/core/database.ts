import Dexie, { type Table } from 'dexie'

export interface TaskRecord {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: number
  parentId: string | null
  groupId: string | null
  dueDate: string | null
  dueTime: string | null
  reminderIds: string[]
  dependencyIds: string[]
  attachmentIds: string[]
  isRecurring: boolean
  recurringRule: string | null
  isImportant: boolean
  isMigrated: boolean
  estimatedMinutes: number
  actualMinutes: number
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  updatedAt: string
  order: number
}

export interface GroupRecord {
  id: string
  name: string
  color: string
  icon: string
  parentId: string | null
  order: number
  createdAt: string
}

export interface ReminderRecord {
  id: string
  taskId: string
  type: 'once' | 'progressive' | 'persistent'
  triggerAt: string
  isTriggered: boolean
  snoozedUntil: string | null
  createdAt: string
}

export interface AttachmentRecord {
  id: string
  taskId: string
  type: 'file' | 'link' | 'image' | 'local_path'
  name: string
  url: string
  size: number
  createdAt: string
}

export interface SettingsRecord {
  key: string
  value: string
}

export interface StickyNoteRecord {
  id: string
  content: string
  color: string
  tags: string[]
  isPinned: boolean
  createdAt: string
  updatedAt: string
  order: number
}

export interface KnowledgeBaseRecord {
  id: string
  name: string
  icon: string
  order: number
  createdAt: string
}

export interface FolderRecord {
  id: string
  kbId: string
  name: string
  order: number
  createdAt: string
}

export interface DocRecord {
  id: string
  folderId: string
  kbId: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
  order: number
}

export interface DocChunkRecord {
  id: string
  docId: string
  parentId: string | null
  headingLevel: number
  headingText: string
  content: string
  outgoingLinks: string[]
  tags: string[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface InspirationRecord {
  id: string
  title: string
  content: string
  source: string
  sourceUrl: string
  sourceAuthor: string
  coverImage: string
  categoryId: string | null
  tags: string
  status: string
  isFavorite: number
  createdAt: string
  updatedAt: string
  order: number
}

export interface InspirationCategoryRecord {
  id: string
  name: string
  icon: string
  color: string
  order: number
  createdAt: string
}

export interface InspirationStickyNoteRecord {
  id: string
  content: string
  tags: string
  title: string
  source: string
  sourceUrl: string
  sourceAuthor: string
  coverImage: string
  categoryId: string | null
  status: string
  isFavorite: number
  color: string
  isPinned: number
  createdAt: string
  updatedAt: string
  order: number
}

export interface DocLinkRecord {
  id: string
  sourceDocId: string
  targetDocId: string
  type: 'reference' | 'related' | 'depends_on' | 'extends' | 'contradicts'
  description: string
  createdAt: string
}

class NotePlanDB extends Dexie {
  tasks!: Table<TaskRecord, string>
  groups!: Table<GroupRecord, string>
  reminders!: Table<ReminderRecord, string>
  attachments!: Table<AttachmentRecord, string>
  settings!: Table<SettingsRecord, string>
  stickyNotes!: Table<StickyNoteRecord, string>
  knowledgeBases!: Table<KnowledgeBaseRecord, string>
  folders!: Table<FolderRecord, string>
  docs!: Table<DocRecord, string>
  docChunks!: Table<DocChunkRecord, string>
  docLinks!: Table<DocLinkRecord, string>
  inspirations!: Table<InspirationRecord, string>
  inspirationCategories!: Table<InspirationCategoryRecord, string>
  inspirationStickyNotes!: Table<InspirationStickyNoteRecord, string>

  constructor() {
    super('NotePlanDB')
    this.version(4).stores({
      tasks: 'id, title, status, priority, parentId, groupId, dueDate, isImportant, isRecurring, createdAt, completedAt, order',
      groups: 'id, name, parentId, order',
      tags: 'id, name',
      reminders: 'id, taskId, triggerAt, isTriggered',
      attachments: 'id, taskId, type',
      settings: 'key',
      stickyNotes: 'id, isPinned, createdAt, order',
      knowledgeBases: 'id, order',
      folders: 'id, kbId, order',
      docs: 'id, folderId, kbId, createdAt, order',
      docChunks: 'id, docId, parentId, headingLevel, order',
      docLinks: 'id, sourceDocId, targetDocId, type',
    })
    this.version(5).stores({
      tasks: 'id, title, status, priority, parentId, groupId, dueDate, isImportant, isRecurring, createdAt, completedAt, order',
      groups: 'id, name, parentId, order',
      tags: 'id, name',
      reminders: 'id, taskId, triggerAt, isTriggered',
      attachments: 'id, taskId, type',
      settings: 'key',
      stickyNotes: 'id, isPinned, createdAt, order',
      knowledgeBases: 'id, order',
      folders: 'id, kbId, order',
      docs: 'id, folderId, kbId, createdAt, order',
      docChunks: 'id, docId, parentId, headingLevel, order',
      docLinks: 'id, sourceDocId, targetDocId, type',
      inspirations: 'id, source, status, categoryId, isFavorite, createdAt, order',
      inspirationCategories: 'id, order',
    })
    this.version(6).stores({
      tasks: 'id, title, status, priority, parentId, groupId, dueDate, isImportant, isRecurring, createdAt, completedAt, order',
      groups: 'id, name, parentId, order',
      tags: 'id, name',
      reminders: 'id, taskId, triggerAt, isTriggered',
      attachments: 'id, taskId, type',
      settings: 'key',
      stickyNotes: 'id, isPinned, createdAt, order',
      knowledgeBases: 'id, order',
      folders: 'id, kbId, order',
      docs: 'id, folderId, kbId, createdAt, order',
      docChunks: 'id, docId, parentId, headingLevel, order',
      docLinks: 'id, sourceDocId, targetDocId, type',
      inspirations: 'id, source, status, categoryId, isFavorite, createdAt, order',
      inspirationCategories: 'id, order',
      inspirationStickyNotes: 'id, status, categoryId, isFavorite, isPinned, createdAt, order',
    })
    this.version(7).stores({
      tags: null,
    })
  }
}

export const db = new NotePlanDB()

export async function clearAllData(): Promise<void> {
  await Promise.all([
    db.tasks.clear(),
    db.groups.clear(),
    db.reminders.clear(),
    db.attachments.clear(),
    db.settings.clear(),
    db.stickyNotes.clear(),
    db.knowledgeBases.clear(),
    db.folders.clear(),
    db.docs.clear(),
    db.docChunks.clear(),
    db.docLinks.clear(),
    db.inspirations.clear(),
    db.inspirationCategories.clear(),
    db.inspirationStickyNotes.clear(),
  ])
}

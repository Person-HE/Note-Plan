import { create } from 'zustand'
import { db } from '@/core/database'
import { generateId, toISODateTimeString } from '@/shared'
import { useNoteStore } from '@/modules/note/store'
import type { InspirationStickyNote, InspirationCategory, InspirationSource, InspirationStatus, StickyColor, SharePayload } from './types'

interface SourceAdapter {
  name: string
  detect: (url: string) => boolean
  extract: (payload: SharePayload) => { title: string; content: string; author: string; coverImage: string }
}

const DouyinAdapter: SourceAdapter = {
  name: '抖音',
  detect: (url: string) => {
    return /douyin\.com|iesdouyin\.com|v\.douyin\.com/i.test(url)
  },
  extract: (payload: SharePayload) => {
    const title = payload.title || ''
    const text = payload.text || ''
    const content = text || title
    return {
      title: title || '抖音视频',
      content,
      author: '',
      coverImage: '',
    }
  },
}

const WeChatAdapter: SourceAdapter = {
  name: '微信',
  detect: (url: string) => {
    return /mp\.weixin\.qq\.com|weixin\.qq\.com/i.test(url)
  },
  extract: (payload: SharePayload) => {
    const title = payload.title || ''
    const text = payload.text || ''
    const content = text || title
    return {
      title: title || '微信文章',
      content,
      author: '',
      coverImage: '',
    }
  },
}

const adapters: SourceAdapter[] = [DouyinAdapter, WeChatAdapter]

function getAdapter(url: string): SourceAdapter | null {
  for (const adapter of adapters) {
    if (adapter.detect(url)) {
      return adapter
    }
  }
  return null
}

function recordToItem(record: any): InspirationStickyNote {
  return {
    ...record,
    source: record.source as InspirationSource,
    status: record.status as InspirationStatus,
    color: record.color as StickyColor,
    tags: JSON.parse(record.tags || '[]'),
    isFavorite: record.isFavorite === 1,
    categoryId: record.categoryId,
  }
}

function itemToRecord(item: InspirationStickyNote): any {
  return {
    ...item,
    tags: JSON.stringify(item.tags),
    isFavorite: item.isFavorite ? 1 : 0,
  }
}

interface InspirationStickyState {
  items: InspirationStickyNote[]
  categories: InspirationCategory[]
  isLoading: boolean
  searchQuery: string
  selectedCategoryId: string | null

  loadAll: () => Promise<void>
  addInspiration: (input: { title: string; content: string; source: InspirationSource; sourceUrl?: string; sourceAuthor?: string; coverImage?: string; categoryId?: string | null; tags?: string[] }) => Promise<InspirationStickyNote>
  addStickyNote: (input: { content: string; color?: StickyColor; tags?: string[] }) => Promise<InspirationStickyNote>
  updateItem: (id: string, updates: Partial<InspirationStickyNote>) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  toggleFavorite: (id: string) => Promise<void>
  togglePin: (id: string) => Promise<void>
  markRead: (id: string) => Promise<void>
  createCategory: (name: string, icon: string, color: string) => Promise<InspirationCategory>
  renameCategory: (id: string, name: string) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  setFilter: (searchQuery: string) => void
  selectCategory: (id: string | null) => void
  getFilteredItems: () => InspirationStickyNote[]
  handleShare: (payload: SharePayload) => Promise<InspirationStickyNote>
  importFromClipboard: () => Promise<InspirationStickyNote | null>
  migrateFromOldTables: () => Promise<void>
}

export const useInspirationStickyStore = create<InspirationStickyState>((set, get) => ({
  items: [],
  categories: [],
  isLoading: false,
  searchQuery: '',
  selectedCategoryId: null,

  loadAll: async () => {
    set({ isLoading: true })
    try {
      await get().migrateFromOldTables()
      const itemRecords = await (db as any).inspirationStickyNotes.toArray()
      const categoryRecords = await (db as any).inspirationCategories.toArray()
      const items = itemRecords.map(recordToItem).sort((a: InspirationStickyNote, b: InspirationStickyNote) => a.order - b.order)
      const categories = categoryRecords.map((r: any) => ({ ...r } as InspirationCategory)).sort((a: InspirationCategory, b: InspirationCategory) => a.order - b.order)
      set({ items, categories, isLoading: false })
    } catch (err) {
      console.error('Failed to load inspiration-sticky data:', err)
      set({ isLoading: false })
    }
  },

  addInspiration: async (input) => {
    const now = toISODateTimeString(new Date())
    const maxOrder = get().items.reduce((max, n) => Math.max(max, n.order), -1)
    const item: InspirationStickyNote = {
      id: generateId(),
      title: input.title,
      content: input.content,
      source: input.source,
      sourceUrl: input.sourceUrl || '',
      sourceAuthor: input.sourceAuthor || '',
      coverImage: input.coverImage || '',
      categoryId: input.categoryId ?? null,
      tags: input.tags || [],
      status: 'unread',
      isFavorite: false,
      color: 'yellow',
      isPinned: false,
      createdAt: now,
      updatedAt: now,
      order: maxOrder + 1,
    }
    await (db as any).inspirationStickyNotes.add(itemToRecord(item))
    set(state => ({ items: [...state.items, item] }))

    if (input.source === 'douyin' || input.source === 'wechat') {
      try {
        const noteStore = useNoteStore.getState()
        const targetKb = noteStore.knowledgeBases[0]
        if (targetKb) {
          let folder = targetKb.folders.find(f => f.name === '灵感采集')
          if (!folder) {
            await noteStore.createFolder(targetKb.id, '灵感采集')
            const updatedKb = useNoteStore.getState().knowledgeBases.find(k => k.id === targetKb.id)
            folder = updatedKb?.folders.find(f => f.name === '灵感采集')
          }
          if (folder) {
            const docId = await noteStore.createDoc(targetKb.id, folder.id)
            await noteStore.openDoc(docId)
            await noteStore.saveDoc(input.title, `<h1>${input.title}</h1><p>来源：${input.source}</p>${input.content ? `<p>${input.content}</p>` : ''}`, input.tags || [])
            await noteStore.closeDoc()
          }
        }
      } catch {}
    }

    return item
  },

  addStickyNote: async (input) => {
    const id = generateId()
    const now = toISODateTimeString(new Date())
    const item: InspirationStickyNote = {
      id,
      title: input.content.trim().slice(0, 50) + (input.content.trim().length > 50 ? '...' : ''),
      content: input.content.trim(),
      source: 'manual' as InspirationSource,
      sourceUrl: '',
      sourceAuthor: '',
      coverImage: '',
      categoryId: null,
      status: 'unread' as InspirationStatus,
      isFavorite: false,
      color: input.color || 'yellow',
      isPinned: false,
      tags: input.tags || [],
      createdAt: now,
      updatedAt: now,
      order: get().items.length,
    }
    await (db as any).inspirationStickyNotes.add(itemToRecord(item))
    set(state => ({ items: [...state.items, item] }))
    return item
  },

  updateItem: async (id, updates) => {
    const now = toISODateTimeString(new Date())
    const updatedFields = { ...updates, updatedAt: now }
    const existing = get().items.find(i => i.id === id)
    if (!existing) return
    const merged = { ...existing, ...updatedFields }
    await (db as any).inspirationStickyNotes.update(id, itemToRecord(merged))
    set(state => ({
      items: state.items.map(i =>
        i.id === id ? merged : i
      ),
    }))
  },

  deleteItem: async (id) => {
    await (db as any).inspirationStickyNotes.delete(id)
    set(state => ({
      items: state.items.filter(i => i.id !== id),
    }))
  },

  toggleFavorite: async (id) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return
    const now = toISODateTimeString(new Date())
    const updated = { ...item, isFavorite: !item.isFavorite, updatedAt: now }
    await (db as any).inspirationStickyNotes.update(id, itemToRecord(updated))
    set(state => ({
      items: state.items.map(i =>
        i.id === id ? updated : i
      ),
    }))
  },

  togglePin: async (id) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return
    const now = toISODateTimeString(new Date())
    const updated = { ...item, isPinned: !item.isPinned, updatedAt: now }
    await (db as any).inspirationStickyNotes.update(id, itemToRecord(updated))
    set(state => ({
      items: state.items.map(i =>
        i.id === id ? updated : i
      ),
    }))
  },

  markRead: async (id) => {
    const item = get().items.find(i => i.id === id)
    if (!item) return
    const now = toISODateTimeString(new Date())
    const updated = { ...item, status: 'read' as InspirationStatus, updatedAt: now }
    await (db as any).inspirationStickyNotes.update(id, itemToRecord(updated))
    set(state => ({
      items: state.items.map(i =>
        i.id === id ? updated : i
      ),
    }))
  },

  createCategory: async (name, icon, color) => {
    const now = toISODateTimeString(new Date())
    const maxOrder = get().categories.reduce((max, c) => Math.max(max, c.order), -1)
    const category: InspirationCategory = {
      id: generateId(),
      name,
      icon,
      color,
      order: maxOrder + 1,
      createdAt: now,
    }
    await (db as any).inspirationCategories.add({ ...category })
    set(state => ({ categories: [...state.categories, category] }))
    return category
  },

  renameCategory: async (id, name) => {
    await (db as any).inspirationCategories.update(id, { name })
    set(state => ({
      categories: state.categories.map(c =>
        c.id === id ? { ...c, name } : c
      ),
    }))
  },

  deleteCategory: async (id) => {
    await (db as any).inspirationCategories.delete(id)
    set(state => ({
      categories: state.categories.filter(c => c.id !== id),
      items: state.items.map(i =>
        i.categoryId === id ? { ...i, categoryId: null } : i
      ),
    }))
    const affected = get().items.filter(i => i.categoryId === null)
    for (const item of affected) {
      await (db as any).inspirationStickyNotes.update(item.id, { categoryId: null })
    }
  },

  setFilter: (searchQuery) => {
    set({ searchQuery })
  },

  selectCategory: (id) => {
    set({ selectedCategoryId: id })
  },

  handleShare: async (payload: SharePayload) => {
    let source: InspirationSource = payload.source || 'share'
    let title = payload.title || ''
    let content = payload.text || ''
    let sourceUrl = payload.url || ''
    let sourceAuthor = ''
    let coverImage = ''

    if (sourceUrl) {
      const adapter = getAdapter(sourceUrl)
      if (adapter) {
        source = adapter.name === '抖音' ? 'douyin' : 'wechat'
        const extracted = adapter.extract(payload)
        title = extracted.title
        content = extracted.content
        sourceAuthor = extracted.author
        coverImage = extracted.coverImage
      }
    }

    if (!title && content) {
      const firstLine = content.split('\n')[0]
      title = firstLine.length > 50 ? firstLine.slice(0, 50) + '...' : firstLine
    }

    return get().addInspiration({
      title: title || '未命名灵感',
      content,
      source,
      sourceUrl,
      sourceAuthor,
      coverImage,
    })
  },

  importFromClipboard: async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (!text.trim()) return null

      const urlPattern = /^https?:\/\//i
      if (urlPattern.test(text.trim())) {
        const adapter = getAdapter(text.trim())
        const source: InspirationSource = adapter
          ? (adapter.name === '抖音' ? 'douyin' : 'wechat')
          : 'clipboard'

        return get().addInspiration({
          title: adapter ? adapter.extract({ url: text.trim() }).title : text.trim(),
          content: text.trim(),
          source,
          sourceUrl: text.trim(),
        })
      }

      return get().addInspiration({
        title: text.trim().length > 50 ? text.trim().slice(0, 50) + '...' : text.trim(),
        content: text.trim(),
        source: 'clipboard',
      })
    } catch {
      return null
    }
  },

  migrateFromOldTables: async () => {
    try {
      const existingCount = await (db as any).inspirationStickyNotes.count()
      if (existingCount > 0) return

      const oldStickyNotes = await db.stickyNotes.toArray()
      const oldInspirations = await (db as any).inspirations.toArray()

      const migratedItems: any[] = []

      for (const note of oldStickyNotes) {
        migratedItems.push({
          id: note.id,
          content: note.content,
          tags: JSON.stringify(note.tags || []),
          title: note.content.trim().slice(0, 50) + (note.content.trim().length > 50 ? '...' : ''),
          source: 'manual',
          sourceUrl: '',
          sourceAuthor: '',
          coverImage: '',
          categoryId: null,
          status: 'unread',
          isFavorite: 0,
          color: note.color,
          isPinned: note.isPinned ? 1 : 0,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          order: note.order,
        })
      }

      for (const insp of oldInspirations) {
        migratedItems.push({
          id: insp.id,
          content: insp.content,
          tags: insp.tags,
          title: insp.title,
          source: insp.source,
          sourceUrl: insp.sourceUrl,
          sourceAuthor: insp.sourceAuthor,
          coverImage: insp.coverImage,
          categoryId: insp.categoryId,
          status: insp.status,
          isFavorite: insp.isFavorite,
          color: 'yellow',
          isPinned: 0,
          createdAt: insp.createdAt,
          updatedAt: insp.updatedAt,
          order: insp.order,
        })
      }

      if (migratedItems.length > 0) {
        await (db as any).inspirationStickyNotes.bulkAdd(migratedItems)
      }
    } catch (err) {
      console.error('Migration failed:', err)
    }
  },

  getFilteredItems: () => {
    const { items, searchQuery, selectedCategoryId } = get()
    let filtered = items

    if (selectedCategoryId) {
      filtered = filtered.filter(i => i.categoryId === selectedCategoryId)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(i =>
        i.title.toLowerCase().includes(query) ||
        i.content.toLowerCase().includes(query) ||
        i.tags.some(t => t.toLowerCase().includes(query)) ||
        i.sourceAuthor.toLowerCase().includes(query)
      )
    }

    return filtered
  },
}))

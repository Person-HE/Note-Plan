import { create } from 'zustand'
import { db, eventBus } from '@/core'
import { generateId, toISODateTimeString } from '@/shared'
import type { Attachment } from './types'

interface AttachmentState {
  attachments: Attachment[]
  isLoading: boolean

  loadAttachments: (taskId: string) => Promise<void>
  loadAll: () => Promise<void>
  addAttachment: (input: Omit<Attachment, 'id' | 'createdAt'>) => Promise<Attachment>
  removeAttachment: (id: string) => Promise<void>
  updateAttachment: (id: string, updates: Partial<Attachment>) => Promise<void>
  getAttachmentsByTask: (taskId: string) => Attachment[]
  getAttachmentById: (id: string) => Attachment | undefined
}

export const useAttachmentStore = create<AttachmentState>((set, get) => ({
  attachments: [],
  isLoading: false,

  loadAll: async () => {
    set({ isLoading: true })
    try {
      const records = await db.attachments.toArray()
      set({ attachments: records as Attachment[], isLoading: false })
    } catch (err) {
      console.error('Failed to load attachments:', err)
      set({ isLoading: false })
    }
  },

  loadAttachments: async (taskId) => {
    set({ isLoading: true })
    try {
      const records = await db.attachments.where('taskId').equals(taskId).toArray()
      set(state => ({
        attachments: [
          ...state.attachments.filter(a => a.taskId !== taskId),
          ...records as Attachment[],
        ],
        isLoading: false,
      }))
    } catch (err) {
      console.error('Failed to load attachments for task:', err)
      set({ isLoading: false })
    }
  },

  addAttachment: async (input) => {
    const attachment: Attachment = {
      id: generateId(),
      taskId: input.taskId,
      type: input.type,
      name: input.name,
      url: input.url,
      size: input.size,
      createdAt: toISODateTimeString(new Date()),
    }
    await db.attachments.add(attachment)
    set(state => ({ attachments: [...state.attachments, attachment] }))
    eventBus.emit('attachment:added', attachment)
    return attachment
  },

  removeAttachment: async (id) => {
    await db.attachments.delete(id)
    set(state => ({
      attachments: state.attachments.filter(a => a.id !== id),
    }))
    eventBus.emit('attachment:removed', id)
  },

  updateAttachment: async (id, updates) => {
    await db.attachments.update(id, updates)
    set(state => ({
      attachments: state.attachments.map(a => a.id === id ? { ...a, ...updates } : a),
    }))
    eventBus.emit('attachment:updated', { id, ...updates })
  },

  getAttachmentsByTask: (taskId) => {
    return get().attachments.filter(a => a.taskId === taskId)
  },

  getAttachmentById: (id) => {
    return get().attachments.find(a => a.id === id)
  },
}))

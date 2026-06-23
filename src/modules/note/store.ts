import { create } from 'zustand'
import { db, type KnowledgeBaseRecord, type FolderRecord, type DocRecord, type DocChunkRecord, type DocLinkRecord } from '@/core/database'
import { generateId, toISODateTimeString } from '@/shared'
import type { KnowledgeBase, Folder, DocMeta, DocLink, DocLinkType, GraphNode, GraphEdge, ManualRelation } from './types'
import { htmlToChunkRecords, resolveDocLinks, buildGraphData } from './chunker'

const MANUAL_RELATIONS_KEY = 'note-plan-manual-relations'

function loadManualRelationsFromStorage(): ManualRelation[] {
  try {
    const raw = localStorage.getItem(MANUAL_RELATIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveManualRelationsToStorage(relations: ManualRelation[]) {
  localStorage.setItem(MANUAL_RELATIONS_KEY, JSON.stringify(relations))
}

export interface NoteState {
  knowledgeBases: KnowledgeBase[]
  isLoading: boolean
  editingDocId: string | null
  editingDocTitle: string
  editingDocTags: string[]
  editingDocContent: string
  editingDocBacklinks: DocLink[]
  graphNodes: GraphNode[]
  graphEdges: GraphEdge[]
  manualRelations: ManualRelation[]

  loadAll: () => Promise<void>
  createKnowledgeBase: (input: { name: string; icon?: string }) => Promise<void>
  renameKnowledgeBase: (id: string, name: string) => Promise<void>
  deleteKnowledgeBase: (id: string) => Promise<void>
  createFolder: (kbId: string, name: string) => Promise<void>
  renameFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  createDoc: (kbId: string, folderId: string) => Promise<string>
  deleteDoc: (id: string) => Promise<void>
  openDoc: (docId: string) => Promise<void>
  closeDoc: () => void
  saveDoc: (title: string, content: string, tags: string[]) => Promise<void>
  addDocLink: (sourceDocId: string, targetDocId: string, type: DocLinkType, description?: string) => Promise<void>
  removeDocLink: (linkId: string) => Promise<void>
  loadGraph: () => Promise<void>
  addManualRelation: (relation: Omit<ManualRelation, 'id' | 'createdAt'>) => void
  removeManualRelation: (id: string) => void
}

export const useNoteStore = create<NoteState>((set, get) => ({
  knowledgeBases: [],
  isLoading: false,
  editingDocId: null,
  editingDocTitle: '',
  editingDocTags: [],
  editingDocContent: '',
  editingDocBacklinks: [],
  graphNodes: [],
  graphEdges: [],
  manualRelations: loadManualRelationsFromStorage(),

  loadAll: async () => {
    set({ isLoading: true })
    try {
      const [kbRecords, folderRecords, docRecords, chunkRecords, linkRecords] = await Promise.all([
        db.knowledgeBases.toArray(),
        db.folders.toArray(),
        db.docs.toArray(),
        db.docChunks.toArray(),
        db.docLinks.toArray(),
      ])

      const chunkCountMap = new Map<string, number>()
      for (const c of chunkRecords) {
        chunkCountMap.set(c.docId, (chunkCountMap.get(c.docId) || 0) + 1)
      }

      const outgoingMap = new Map<string, number>()
      const incomingMap = new Map<string, number>()
      for (const l of linkRecords) {
        outgoingMap.set(l.sourceDocId, (outgoingMap.get(l.sourceDocId) || 0) + 1)
        incomingMap.set(l.targetDocId, (incomingMap.get(l.targetDocId) || 0) + 1)
      }

      const knowledgeBases: KnowledgeBase[] = kbRecords.map(kb => ({
        ...kb,
        folders: folderRecords
          .filter(f => f.kbId === kb.id)
          .sort((a, b) => a.order - b.order)
          .map(f => ({
            ...f,
            docs: docRecords
              .filter(d => d.folderId === f.id)
              .sort((a, b) => a.order - b.order)
              .map(d => ({
                id: d.id,
                folderId: d.folderId,
                kbId: d.kbId,
                title: d.title,
                tags: d.tags,
                createdAt: d.createdAt,
                updatedAt: d.updatedAt,
                order: d.order,
                chunkCount: chunkCountMap.get(d.id) || 0,
                outgoingLinkCount: outgoingMap.get(d.id) || 0,
                incomingLinkCount: incomingMap.get(d.id) || 0,
              })),
          })),
      }))

      set({ knowledgeBases, isLoading: false })
    } catch (err) {
      console.error('Failed to load notes:', err)
      set({ isLoading: false })
    }
  },

  createKnowledgeBase: async (input) => {
    const now = toISODateTimeString(new Date())
    const id = generateId()
    const order = get().knowledgeBases.length
    const record: KnowledgeBaseRecord = { id, name: input.name, icon: input.icon ?? 'book', order, createdAt: now }
    await db.knowledgeBases.add(record)
    set(state => ({ knowledgeBases: [...state.knowledgeBases, { ...record, folders: [] }] }))
  },

  renameKnowledgeBase: async (id, name) => {
    await db.knowledgeBases.update(id, { name })
    set(state => ({ knowledgeBases: state.knowledgeBases.map(kb => kb.id === id ? { ...kb, name } : kb) }))
  },

  deleteKnowledgeBase: async (id) => {
    const kb = get().knowledgeBases.find(k => k.id === id)
    if (!kb) return
    const folderIds = kb.folders.map(f => f.id)
    const docIds = kb.folders.flatMap(f => f.docs.map(d => d.id))
    await db.docLinks.where('sourceDocId').anyOf(docIds).delete()
    await db.docLinks.where('targetDocId').anyOf(docIds).delete()
    await db.docChunks.where('docId').anyOf(docIds).delete()
    await db.docs.bulkDelete(docIds)
    await db.folders.bulkDelete(folderIds)
    await db.knowledgeBases.delete(id)
    set(state => ({
      knowledgeBases: state.knowledgeBases.filter(k => k.id !== id),
      editingDocId: docIds.includes(state.editingDocId ?? '') ? null : state.editingDocId,
    }))
  },

  createFolder: async (kbId, name) => {
    const now = toISODateTimeString(new Date())
    const id = generateId()
    const kb = get().knowledgeBases.find(k => k.id === kbId)
    const order = kb ? kb.folders.length : 0
    const record: FolderRecord = { id, kbId, name, order, createdAt: now }
    await db.folders.add(record)
    set(state => ({ knowledgeBases: state.knowledgeBases.map(kb => kb.id === kbId ? { ...kb, folders: [...kb.folders, { ...record, docs: [] }] } : kb) }))
  },

  renameFolder: async (id, name) => {
    await db.folders.update(id, { name })
    set(state => ({ knowledgeBases: state.knowledgeBases.map(kb => ({ ...kb, folders: kb.folders.map(f => f.id === id ? { ...f, name } : f) })) }))
  },

  deleteFolder: async (id) => {
    const docIds = get().knowledgeBases.flatMap(kb => kb.folders).find(f => f.id === id)?.docs.map(d => d.id) ?? []
    await db.docLinks.where('sourceDocId').anyOf(docIds).delete()
    await db.docLinks.where('targetDocId').anyOf(docIds).delete()
    await db.docChunks.where('docId').anyOf(docIds).delete()
    await db.docs.bulkDelete(docIds)
    await db.folders.delete(id)
    set(state => ({
      knowledgeBases: state.knowledgeBases.map(kb => ({ ...kb, folders: kb.folders.filter(f => f.id !== id) })),
      editingDocId: docIds.includes(state.editingDocId ?? '') ? null : state.editingDocId,
    }))
  },

  createDoc: async (kbId, folderId) => {
    const now = toISODateTimeString(new Date())
    const id = generateId()
    const folder = get().knowledgeBases.flatMap(kb => kb.folders).find(f => f.id === folderId)
    const order = folder ? folder.docs.length : 0
    const record: DocRecord = { id, folderId, kbId, title: '', content: '', tags: [], createdAt: now, updatedAt: now, order }
    await db.docs.add(record)
    const docMeta: DocMeta = { id, folderId, kbId, title: '', tags: [], createdAt: now, updatedAt: now, order, chunkCount: 0, outgoingLinkCount: 0, incomingLinkCount: 0 }
    set(state => ({
      knowledgeBases: state.knowledgeBases.map(kb => ({
        ...kb,
        folders: kb.folders.map(f => f.id === folderId ? { ...f, docs: [...f.docs, docMeta] } : f),
      })),
    }))
    return id
  },

  deleteDoc: async (id) => {
    await db.docLinks.where('sourceDocId').equals(id).delete()
    await db.docLinks.where('targetDocId').equals(id).delete()
    await db.docChunks.where('docId').equals(id).delete()
    await db.docs.delete(id)
    set(state => ({
      knowledgeBases: state.knowledgeBases.map(kb => ({
        ...kb,
        folders: kb.folders.map(f => ({ ...f, docs: f.docs.filter(d => d.id !== id) })),
      })),
      editingDocId: state.editingDocId === id ? null : state.editingDocId,
    }))
  },

  openDoc: async (docId) => {
    try {
      const doc = await db.docs.get(docId)
      if (!doc) return

      const backlinks = await db.docLinks.where('targetDocId').equals(docId).toArray()

      set({
        editingDocId: docId,
        editingDocTitle: doc.title,
        editingDocTags: doc.tags,
        editingDocContent: doc.content,
        editingDocBacklinks: backlinks,
      })
    } catch (err) {
      console.error('Failed to open doc:', err)
    }
  },

  closeDoc: () => {
    set({ editingDocId: null, editingDocTitle: '', editingDocTags: [], editingDocContent: '', editingDocBacklinks: [] })
  },

  saveDoc: async (title, content, tags) => {
    const docId = get().editingDocId
    if (!docId) return

    const now = toISODateTimeString(new Date())
    await db.docs.update(docId, { title, content, tags, updatedAt: now })

    await db.docChunks.where('docId').equals(docId).delete()
    const chunkRecords = htmlToChunkRecords(content, docId)
    if (chunkRecords.length > 0) {
      await db.docChunks.bulkAdd(chunkRecords)
    }

    await db.docLinks.where('sourceDocId').equals(docId).delete()
    const allDocs = await db.docs.toArray()
    const docTitleToIdMap = new Map<string, string>()
    for (const d of allDocs) {
      if (d.title) docTitleToIdMap.set(d.title.toLowerCase(), d.id)
    }
    const newLinks = resolveDocLinks(docId, chunkRecords, docTitleToIdMap)
    if (newLinks.length > 0) {
      await db.docLinks.bulkAdd(newLinks)
    }

    const allLinks = await db.docLinks.toArray()
    const outgoingMap = new Map<string, number>()
    const incomingMap = new Map<string, number>()
    for (const l of allLinks) {
      outgoingMap.set(l.sourceDocId, (outgoingMap.get(l.sourceDocId) || 0) + 1)
      incomingMap.set(l.targetDocId, (incomingMap.get(l.targetDocId) || 0) + 1)
    }

    const backlinks = allLinks.filter(l => l.targetDocId === docId)

    set(state => ({
      editingDocTitle: title,
      editingDocTags: tags,
      editingDocBacklinks: backlinks,
      knowledgeBases: state.knowledgeBases.map(kb => ({
        ...kb,
        folders: kb.folders.map(f => ({
          ...f,
          docs: f.docs.map(d => d.id === docId ? {
            ...d,
            title,
            tags,
            updatedAt: now,
            chunkCount: chunkRecords.length,
            outgoingLinkCount: newLinks.length,
            incomingLinkCount: incomingMap.get(docId) || 0,
          } : d),
        })),
      })),
    }))
  },

  addDocLink: async (sourceDocId, targetDocId, type, description = '') => {
    const now = toISODateTimeString(new Date())
    const id = generateId()
    await db.docLinks.add({ id, sourceDocId, targetDocId, type, description, createdAt: now })
    set(state => ({
      editingDocBacklinks: state.editingDocId === targetDocId
        ? [...state.editingDocBacklinks, { id, sourceDocId, targetDocId, type, description, createdAt: now }]
        : state.editingDocBacklinks,
    }))
  },

  removeDocLink: async (linkId) => {
    await db.docLinks.delete(linkId)
    set(state => ({
      editingDocBacklinks: state.editingDocBacklinks.filter(l => l.id !== linkId),
    }))
  },

  loadGraph: async () => {
    const [docs, links] = await Promise.all([db.docs.toArray(), db.docLinks.toArray()])
    const chunks = await db.docChunks.toArray()
    const { nodes, edges } = buildGraphData(docs, chunks, links)

    const manualRelations = get().manualRelations
    const manualEdges: GraphEdge[] = manualRelations.map(r => ({
      source: r.sourceId,
      target: r.targetId,
      type: 'manual' as const,
      label: r.label,
      manualRelationId: r.id,
    }))

    const docIds = new Set(docs.map(d => d.id))
    const validManualEdges = manualEdges.filter(e => docIds.has(e.source) && docIds.has(e.target))

    const allEdges = [...edges, ...validManualEdges]

    const linkCountMap = new Map<string, number>()
    for (const edge of allEdges) {
      linkCountMap.set(edge.source, (linkCountMap.get(edge.source) || 0) + 1)
      linkCountMap.set(edge.target, (linkCountMap.get(edge.target) || 0) + 1)
    }
    for (const node of nodes) {
      node.linkCount = linkCountMap.get(node.id) || node.linkCount
    }

    set({ graphNodes: nodes, graphEdges: allEdges })
  },

  addManualRelation: (relation) => {
    const now = toISODateTimeString(new Date())
    const id = generateId()
    const newRelation: ManualRelation = { id, ...relation, createdAt: now }
    set(state => {
      const manualRelations = [...state.manualRelations, newRelation]
      saveManualRelationsToStorage(manualRelations)

      const docIds = new Set(state.graphNodes.map(n => n.id))
      const newEdge: GraphEdge = {
        source: relation.sourceId,
        target: relation.targetId,
        type: 'manual',
        label: relation.label,
        manualRelationId: id,
      }
      const graphEdges = docIds.has(relation.sourceId) && docIds.has(relation.targetId)
        ? [...state.graphEdges, newEdge]
        : state.graphEdges

      return { manualRelations, graphEdges }
    })
  },

  removeManualRelation: (id) => {
    set(state => {
      const manualRelations = state.manualRelations.filter(r => r.id !== id)
      saveManualRelationsToStorage(manualRelations)
      const graphEdges = state.graphEdges.filter(e => e.manualRelationId !== id)
      return { manualRelations, graphEdges }
    })
  },
}))

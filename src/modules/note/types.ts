export interface KnowledgeBase {
  id: string
  name: string
  icon: string
  order: number
  createdAt: string
  folders: Folder[]
}

export interface Folder {
  id: string
  kbId: string
  name: string
  order: number
  createdAt: string
  docs: DocMeta[]
}

export interface DocMeta {
  id: string
  folderId: string
  kbId: string
  title: string
  tags: string[]
  createdAt: string
  updatedAt: string
  order: number
  chunkCount: number
  outgoingLinkCount: number
  incomingLinkCount: number
}

export interface DocChunk {
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

export type DocLinkType = 'reference' | 'related' | 'depends_on' | 'extends' | 'contradicts'

export interface DocLink {
  id: string
  sourceDocId: string
  targetDocId: string
  type: DocLinkType
  description: string
  createdAt: string
}

export interface ManualRelation {
  id: string
  sourceId: string
  targetId: string
  label: string
  createdAt: string
}

export interface GraphNode {
  id: string
  label: string
  type: 'doc' | 'chunk'
  tags: string[]
  linkCount: number
}

export interface GraphEdge {
  source: string
  target: string
  type: DocLinkType | 'contains' | 'manual'
  label?: string
  manualRelationId?: string
}

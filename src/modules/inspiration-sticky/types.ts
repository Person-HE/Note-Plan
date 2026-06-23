export type InspirationSource = 'douyin' | 'wechat' | 'manual' | 'clipboard' | 'share'
export type InspirationStatus = 'unread' | 'read'
export type StickyColor = 'yellow' | 'blue' | 'pink' | 'green' | 'orange' | 'purple'

export interface InspirationStickyNote {
  id: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
  order: number
  title: string
  source: InspirationSource
  sourceUrl: string
  sourceAuthor: string
  coverImage: string
  categoryId: string | null
  status: InspirationStatus
  isFavorite: boolean
  color: StickyColor
  isPinned: boolean
}

export interface InspirationCategory {
  id: string
  name: string
  icon: string
  color: string
  order: number
  createdAt: string
}

export interface SharePayload {
  title?: string
  text?: string
  url?: string
  source?: InspirationSource
}

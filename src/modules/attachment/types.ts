export interface Attachment {
  id: string
  taskId: string
  type: 'file' | 'link' | 'image' | 'local_path'
  name: string
  url: string
  size: number
  createdAt: string
}

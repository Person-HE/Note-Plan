export interface Collaborator {
  id: string
  name: string
  email: string
  avatar: string
}

export interface SharedList {
  id: string
  name: string
  ownerId: string
  memberIds: string[]
  taskIds: string[]
}

export interface TaskAssignment {
  taskId: string
  assigneeId: string
  permission: 'view' | 'edit' | 'transfer'
}

export interface Comment {
  id: string
  taskId: string
  authorId: string
  content: string
  createdAt: string
}

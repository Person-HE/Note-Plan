import type { Collaborator, SharedList, TaskAssignment, Comment } from './types'

export interface ICollaborationService {
  assignTask(taskId: string, assigneeId: string, permission: TaskAssignment['permission']): Promise<TaskAssignment>
  unassignTask(taskId: string, assigneeId: string): Promise<void>
  updateAssignmentPermission(taskId: string, assigneeId: string, permission: TaskAssignment['permission']): Promise<void>
  getTaskAssignments(taskId: string): Promise<TaskAssignment[]>

  createSharedList(name: string, ownerId: string): Promise<SharedList>
  updateSharedList(id: string, updates: Partial<SharedList>): Promise<void>
  deleteSharedList(id: string): Promise<void>
  addMemberToList(listId: string, memberId: string): Promise<void>
  removeMemberFromList(listId: string, memberId: string): Promise<void>
  addTaskToList(listId: string, taskId: string): Promise<void>
  removeTaskFromList(listId: string, taskId: string): Promise<void>
  getSharedListsByOwner(ownerId: string): Promise<SharedList[]>
  getSharedListsByMember(memberId: string): Promise<SharedList[]>

  addComment(taskId: string, authorId: string, content: string): Promise<Comment>
  updateComment(commentId: string, content: string): Promise<void>
  deleteComment(commentId: string): Promise<void>
  getCommentsByTask(taskId: string): Promise<Comment[]>

  getCollaborator(id: string): Promise<Collaborator | undefined>
  searchCollaborators(query: string): Promise<Collaborator[]>
}

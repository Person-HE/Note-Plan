import { db } from '@/core/database'
import { generateId, toISODateTimeString, toISODateString } from '@/shared'
import { useTaskStore } from '@/modules/task/store'
import { useNoteStore } from '@/modules/note/store'
import { useInspirationStickyStore } from '@/modules/inspiration-sticky/store'
import { useNotificationStore } from '@/modules/notification/store'
import { useAttachmentStore } from '@/modules/attachment/store'
import { useStatisticsStore } from '@/modules/statistics/store'
import { useSettingsStore } from '@/modules/settings/store'
import { useSecurityStore } from '@/modules/security/store'
import { useViewStore } from '@/modules/view/store'
import { parseNaturalLanguage, decomposeTask } from '@/modules/ai/services'
import type { AITool } from './types'

const taskCreateTool: AITool = {
  name: 'task.create',
  description: '创建一个新的待办任务。支持自然语言输入，如"明天下午3点开会 紧急 #工作"',
  parameters: {
    title: { type: 'string', description: '任务标题', required: true },
    description: { type: 'string', description: '任务描述' },
    priority: { type: 'string', description: '优先级: low, medium, high, urgent' },
    dueDate: { type: 'string', description: '截止日期，格式 YYYY-MM-DD' },
    dueTime: { type: 'string', description: '截止时间，格式 HH:mm' },
    groupId: { type: 'string', description: '分组ID' },
    isImportant: { type: 'boolean', description: '是否标记为重要' },
    isRecurring: { type: 'boolean', description: '是否为循环任务' },
    recurringType: { type: 'string', description: '循环类型: daily, weekly, monthly, yearly, custom' },
    recurringInterval: { type: 'number', description: '循环间隔，如每2周则填2' },
    estimatedMinutes: { type: 'number', description: '预估耗时（分钟）' },
    parentId: { type: 'string', description: '父任务ID，创建子任务时使用' },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const recurringRule = args.isRecurring && args.recurringType ? {
        type: args.recurringType as 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom',
        interval: args.recurringInterval ?? 1,
      } : null
      const task = await store.createTask({
        title: args.title,
        description: args.description ?? '',
        priority: (args.priority as any) ?? 'medium',
        dueDate: args.dueDate ?? null,
        dueTime: args.dueTime ?? null,
        groupId: args.groupId ?? null,
        isImportant: args.isImportant ?? false,
        isRecurring: args.isRecurring ?? false,
        recurringRule,
        estimatedMinutes: args.estimatedMinutes ?? 0,
        parentId: args.parentId ?? null,
      })
      return `已创建任务「${args.title}」${args.priority ? `，优先级：${args.priority}` : ''}${args.dueDate ? `，截止：${args.dueDate}` : ''}${args.dueTime ? ` ${args.dueTime}` : ''}${args.isImportant ? '，[★]重要' : ''}${args.isRecurring ? `，循环：${args.recurringType}` : ''}（ID: ${task.id}）`
    } catch (err) {
      return `创建任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskCreateNLTool: AITool = {
  name: 'task.create_natural',
  description: '用自然语言创建任务，自动解析日期、时间、优先级、标签。如"明天下午3点开会 紧急 #工作"',
  parameters: {
    text: { type: 'string', description: '自然语言任务描述', required: true },
  },
  execute: async (args) => {
    try {
      const nlpResult = parseNaturalLanguage(args.text)
      const store = useTaskStore.getState()
      const task = await store.createTask({
        title: nlpResult.title,
        priority: nlpResult.priority ?? 'medium',
        dueDate: nlpResult.dueDate ?? null,
        dueTime: nlpResult.dueTime ?? null,
      })
      let msg = `已创建任务「${nlpResult.title}」`
      if (nlpResult.dueDate) msg += `，截止：${nlpResult.dueDate}`
      if (nlpResult.dueTime) msg += ` ${nlpResult.dueTime}`
      if (nlpResult.priority && nlpResult.priority !== 'medium') msg += `，优先级：${nlpResult.priority}`
      msg += `（ID: ${task.id}）`
      return msg
    } catch (err) {
      return `创建任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskUpdateTool: AITool = {
  name: 'task.update',
  description: '更新任务的各种属性',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
    title: { type: 'string', description: '新标题' },
    description: { type: 'string', description: '新描述' },
    priority: { type: 'string', description: '新优先级: low, medium, high, urgent' },
    dueDate: { type: 'string', description: '新截止日期，格式 YYYY-MM-DD' },
    dueTime: { type: 'string', description: '新截止时间，格式 HH:mm' },
    groupId: { type: 'string', description: '新分组ID' },
    isImportant: { type: 'boolean', description: '是否重要' },
    estimatedMinutes: { type: 'number', description: '预估耗时（分钟）' },
    status: { type: 'string', description: '新状态: pending, in_progress, completed, cancelled' },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      const updates: Record<string, any> = {}
      if (args.title !== undefined) updates.title = args.title
      if (args.description !== undefined) updates.description = args.description
      if (args.priority !== undefined) updates.priority = args.priority
      if (args.dueDate !== undefined) updates.dueDate = args.dueDate
      if (args.dueTime !== undefined) updates.dueTime = args.dueTime
      if (args.groupId !== undefined) updates.groupId = args.groupId
      if (args.isImportant !== undefined) updates.isImportant = args.isImportant
      if (args.estimatedMinutes !== undefined) updates.estimatedMinutes = args.estimatedMinutes
      if (args.status !== undefined) updates.status = args.status
      await store.updateTask(args.id, updates)
      return `已更新任务「${task.title}」`
    } catch (err) {
      return `更新任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskDeleteTool: AITool = {
  name: 'task.delete',
  description: '删除指定任务（包含其子任务）',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      await store.deleteTask(args.id)
      return `已删除任务「${task.title}」`
    } catch (err) {
      return `删除任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskCompleteTool: AITool = {
  name: 'task.complete',
  description: '将任务标记为已完成',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      await store.completeTask(args.id)
      return `[✓] 已完成任务「${task.title}」`
    } catch (err) {
      return `完成任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskUncompleteTool: AITool = {
  name: 'task.uncomplete',
  description: '将已完成的任务恢复为待办',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      await store.uncompleteTask(args.id)
      return `已将任务「${task.title}」恢复为待办`
    } catch (err) {
      return `恢复任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskCancelTool: AITool = {
  name: 'task.cancel',
  description: '取消任务',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      await store.updateTask(args.id, { status: 'cancelled' })
      return `已取消任务「${task.title}」`
    } catch (err) {
      return `取消任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskStartTool: AITool = {
  name: 'task.start',
  description: '开始执行任务（状态变为in_progress）',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      await store.updateTask(args.id, { status: 'in_progress', startedAt: toISODateTimeString(new Date()) })
      return `已开始任务「${task.title}」`
    } catch (err) {
      return `开始任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskListTool: AITool = {
  name: 'task.list',
  description: '列出任务，可按状态、优先级、分组筛选',
  parameters: {
    status: { type: 'string', description: '筛选状态: pending, in_progress, completed, cancelled' },
    priority: { type: 'string', description: '筛选优先级: low, medium, high, urgent' },
    groupId: { type: 'string', description: '筛选分组ID' },
    isImportant: { type: 'boolean', description: '是否只显示重要任务' },
    searchQuery: { type: 'string', description: '搜索关键词' },
    limit: { type: 'number', description: '返回数量限制，默认20' },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      let tasks = store.tasks
      if (args.status) tasks = tasks.filter(t => t.status === args.status)
      if (args.priority) tasks = tasks.filter(t => t.priority === args.priority)
      if (args.groupId) tasks = tasks.filter(t => t.groupId === args.groupId)
      if (args.isImportant) tasks = tasks.filter(t => t.isImportant)
      if (args.searchQuery) {
        const q = args.searchQuery.toLowerCase()
        tasks = tasks.filter(t => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q))
      }
      if (tasks.length === 0) return '没有找到匹配的任务'
      const limit = args.limit ?? 20
      const statusIcon: Record<string, string> = { completed: '[✓]', in_progress: '[~]', pending: '○', cancelled: '[✗]' }
      const priorityIcon: Record<string, string> = { urgent: '[!]', high: '[-]', medium: '[·]', low: '[○]' }
      const lines = tasks.slice(0, limit).map(t =>
        `${statusIcon[t.status] || '○'} ${priorityIcon[t.priority] || ''} ${t.title}${t.dueDate ? ` [日]${t.dueDate}` : ''}${t.isImportant ? ' [★]' : ''}（ID: ${t.id}）`
      )
      const suffix = tasks.length > limit ? `\n...还有 ${tasks.length - limit} 个任务` : ''
      return `共 ${tasks.length} 个任务：\n${lines.join('\n')}${suffix}`
    } catch (err) {
      return `获取任务列表失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskGetTool: AITool = {
  name: 'task.get',
  description: '获取任务的详细信息',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      const subtasks = store.getSubtasks(args.id)
      const lines = [
        `[□] 任务详情`,
        `  标题：${task.title}`,
        `  状态：${task.status}`,
        `  优先级：${task.priority}`,
        `  进度：${task.progress}%`,
        `  描述：${task.description || '无'}`,
        `  截止日期：${task.dueDate || '无'}`,
        `  截止时间：${task.dueTime || '无'}`,
        `  重要：${task.isImportant ? '是' : '否'}`,
        `  循环：${task.isRecurring ? '是' : '否'}`,
        `  预估耗时：${task.estimatedMinutes ? `${task.estimatedMinutes}分钟` : '未设置'}`,
        `  实际耗时：${task.actualMinutes ? `${task.actualMinutes}分钟` : '未记录'}`,
        `  创建时间：${task.createdAt}`,
        `  更新时间：${task.updatedAt}`,
      ]
      if (subtasks.length > 0) {
        lines.push(`  子任务（${subtasks.length}个）：`)
        subtasks.forEach(st => {
          lines.push(`    - ${st.status === 'completed' ? '[✓]' : '○'} ${st.title}（ID: ${st.id}）`)
        })
      }
      return lines.join('\n')
    } catch (err) {
      return `获取任务详情失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskSetImportantTool: AITool = {
  name: 'task.set_important',
  description: '设置或取消任务的重要性标记',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
    important: { type: 'boolean', description: 'true标记为重要，false取消', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      await store.setTaskImportant(args.id, args.important)
      return args.important ? `已将任务「${task.title}」标记为[★]重要` : `已取消任务「${task.title}」的重要标记`
    } catch (err) {
      return `设置重要性失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskUpdateProgressTool: AITool = {
  name: 'task.update_progress',
  description: '更新任务进度（0-100）',
  parameters: {
    id: { type: 'string', description: '任务ID', required: true },
    progress: { type: 'number', description: '进度值（0-100）', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      const progress = Math.max(0, Math.min(100, args.progress))
      await store.updateProgress(args.id, progress)
      return `已更新任务「${task.title}」进度为 ${progress}%`
    } catch (err) {
      return `更新进度失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskDecomposeTool: AITool = {
  name: 'task.decompose',
  description: '将任务分解为子任务，使用AI智能分解',
  parameters: {
    id: { type: 'string', description: '要分解的任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const task = store.getTaskById(args.id)
      if (!task) return `未找到ID为 ${args.id} 的任务`
      const decomposition = decomposeTask(task.title)
      const created: string[] = []
      for (const subtaskTitle of decomposition.subtasks) {
        const subtask = await store.createTask({
          title: subtaskTitle,
          parentId: args.id,
          priority: task.priority,
          groupId: task.groupId,
        })
        created.push(subtaskTitle)
      }
      return `已将任务「${task.title}」分解为 ${created.length} 个子任务：\n${created.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}`
    } catch (err) {
      return `分解任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskMigrateTool: AITool = {
  name: 'task.migrate_overdue',
  description: '将所有逾期的未完成任务迁移到今天',
  parameters: {},
  execute: async () => {
    try {
      const store = useTaskStore.getState()
      await store.migrateIncompleteTasks()
      return '已将逾期未完成任务迁移到今天'
    } catch (err) {
      return `迁移任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const taskSearchTool: AITool = {
  name: 'task.search',
  description: '搜索任务（按标题或描述关键词）',
  parameters: {
    query: { type: 'string', description: '搜索关键词', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const q = args.query.toLowerCase()
      const results = store.tasks.filter(t =>
        t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      )
      if (results.length === 0) return `未找到与「${args.query}」相关的任务`
      const lines = results.slice(0, 20).map(t =>
        `- [${t.status === 'completed' ? '✓' : '○'}] ${t.title}（ID: ${t.id}，${t.priority}）`
      )
      return `找到 ${results.length} 个相关任务：\n${lines.join('\n')}`
    } catch (err) {
      return `搜索任务失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const groupCreateTool: AITool = {
  name: 'group.create',
  description: '创建任务分组',
  parameters: {
    name: { type: 'string', description: '分组名称', required: true },
    color: { type: 'string', description: '分组颜色，如 #FF5733' },
    icon: { type: 'string', description: '分组图标，如 [▸]' },
    parentId: { type: 'string', description: '父分组ID' },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const group = await store.createGroup({
        name: args.name,
        color: args.color ?? '#6366f1',
        icon: args.icon ?? '[▸]',
        parentId: args.parentId ?? null,
      })
      return `已创建分组「${args.name}」（ID: ${group.id}）`
    } catch (err) {
      return `创建分组失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const groupUpdateTool: AITool = {
  name: 'group.update',
  description: '更新分组属性',
  parameters: {
    id: { type: 'string', description: '分组ID', required: true },
    name: { type: 'string', description: '新名称' },
    color: { type: 'string', description: '新颜色' },
    icon: { type: 'string', description: '新图标' },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const group = store.groups.find(g => g.id === args.id)
      if (!group) return `未找到ID为 ${args.id} 的分组`
      const updates: Record<string, any> = {}
      if (args.name !== undefined) updates.name = args.name
      if (args.color !== undefined) updates.color = args.color
      if (args.icon !== undefined) updates.icon = args.icon
      await store.updateGroup(args.id, updates)
      return `已更新分组「${group.name}」`
    } catch (err) {
      return `更新分组失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const groupDeleteTool: AITool = {
  name: 'group.delete',
  description: '删除分组（分组下的任务不会被删除，只是取消分组关联）',
  parameters: {
    id: { type: 'string', description: '分组ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useTaskStore.getState()
      const group = store.groups.find(g => g.id === args.id)
      if (!group) return `未找到ID为 ${args.id} 的分组`
      await store.deleteGroup(args.id)
      return `已删除分组「${group.name}」`
    } catch (err) {
      return `删除分组失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const groupListTool: AITool = {
  name: 'group.list',
  description: '列出所有任务分组',
  parameters: {},
  execute: async () => {
    try {
      const store = useTaskStore.getState()
      if (store.groups.length === 0) return '暂无分组'
      const lines = store.groups.map(g => {
        const count = store.tasks.filter(t => t.groupId === g.id).length
        return `- ${g.icon} ${g.name}（${count}个任务，ID: ${g.id}）`
      })
      return `共 ${store.groups.length} 个分组：\n${lines.join('\n')}`
    } catch (err) {
      return `获取分组列表失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const kbCreateTool: AITool = {
  name: 'kb.create',
  description: '创建知识库',
  parameters: {
    name: { type: 'string', description: '知识库名称', required: true },
    icon: { type: 'string', description: '知识库图标，如 [¶]' },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.createKnowledgeBase({ name: args.name, icon: args.icon })
      return `已创建知识库「${args.name}」`
    } catch (err) {
      return `创建知识库失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const kbRenameTool: AITool = {
  name: 'kb.rename',
  description: '重命名知识库',
  parameters: {
    id: { type: 'string', description: '知识库ID', required: true },
    name: { type: 'string', description: '新名称', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.renameKnowledgeBase(args.id, args.name)
      return `已重命名知识库为「${args.name}」`
    } catch (err) {
      return `重命名知识库失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const kbDeleteTool: AITool = {
  name: 'kb.delete',
  description: '删除知识库（包含所有文件夹和文档）',
  parameters: {
    id: { type: 'string', description: '知识库ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      const kb = store.knowledgeBases.find(k => k.id === args.id)
      if (!kb) return `未找到ID为 ${args.id} 的知识库`
      await store.deleteKnowledgeBase(args.id)
      return `已删除知识库「${kb.name}」及其所有内容`
    } catch (err) {
      return `删除知识库失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const kbListTool: AITool = {
  name: 'kb.list',
  description: '列出所有知识库及其文件夹和文档',
  parameters: {},
  execute: async () => {
    try {
      const store = useNoteStore.getState()
      if (store.knowledgeBases.length === 0) return '暂无知识库'
      const lines = store.knowledgeBases.map(kb => {
        const folderLines = kb.folders.map(f => {
          const docLines = f.docs.map(d => `      [·] ${d.title || '未命名'}（ID: ${d.id}）`)
          return `    [▸] ${f.name}（${f.docs.length}篇文档，ID: ${f.id}）${docLines.length > 0 ? '\n' + docLines.join('\n') : ''}`
        })
        return `${kb.icon} ${kb.name}（${kb.folders.length}个文件夹，ID: ${kb.id}）${folderLines.length > 0 ? '\n' + folderLines.join('\n') : ''}`
      })
      return `共 ${store.knowledgeBases.length} 个知识库：\n${lines.join('\n')}`
    } catch (err) {
      return `获取知识库列表失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const folderCreateTool: AITool = {
  name: 'folder.create',
  description: '在知识库中创建文件夹',
  parameters: {
    kbId: { type: 'string', description: '知识库ID', required: true },
    name: { type: 'string', description: '文件夹名称', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.createFolder(args.kbId, args.name)
      return `已在知识库中创建文件夹「${args.name}」`
    } catch (err) {
      return `创建文件夹失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const folderRenameTool: AITool = {
  name: 'folder.rename',
  description: '重命名文件夹',
  parameters: {
    id: { type: 'string', description: '文件夹ID', required: true },
    name: { type: 'string', description: '新名称', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.renameFolder(args.id, args.name)
      return `已重命名文件夹为「${args.name}」`
    } catch (err) {
      return `重命名文件夹失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const folderDeleteTool: AITool = {
  name: 'folder.delete',
  description: '删除文件夹（包含所有文档）',
  parameters: {
    id: { type: 'string', description: '文件夹ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.deleteFolder(args.id)
      return `已删除文件夹及其所有文档`
    } catch (err) {
      return `删除文件夹失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docCreateTool: AITool = {
  name: 'doc.create',
  description: '在知识库文件夹中创建文档',
  parameters: {
    kbId: { type: 'string', description: '知识库ID', required: true },
    folderId: { type: 'string', description: '文件夹ID', required: true },
    title: { type: 'string', description: '文档标题' },
    content: { type: 'string', description: '文档内容（HTML格式）' },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      const docId = await store.createDoc(args.kbId, args.folderId)
      if (args.title || args.content) {
        await store.openDoc(docId)
        await store.saveDoc(args.title ?? '', args.content ?? '', [])
        await store.closeDoc()
      }
      return `已创建文档「${args.title || '未命名'}」（ID: ${docId}）`
    } catch (err) {
      return `创建文档失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docDeleteTool: AITool = {
  name: 'doc.delete',
  description: '删除文档',
  parameters: {
    id: { type: 'string', description: '文档ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.deleteDoc(args.id)
      return `已删除文档`
    } catch (err) {
      return `删除文档失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docOpenTool: AITool = {
  name: 'doc.open',
  description: '打开文档进行编辑',
  parameters: {
    id: { type: 'string', description: '文档ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.openDoc(args.id)
      return `已打开文档「${store.editingDocTitle || args.id}」`
    } catch (err) {
      return `打开文档失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docSaveTool: AITool = {
  name: 'doc.save',
  description: '保存当前正在编辑的文档',
  parameters: {
    title: { type: 'string', description: '文档标题', required: true },
    content: { type: 'string', description: '文档内容（HTML格式）', required: true },
    tags: { type: 'string', description: '标签，逗号分隔' },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      if (!store.editingDocId) return '当前没有打开的文档，请先使用doc.open打开文档'
      const tags = args.tags ? args.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []
      await store.saveDoc(args.title, args.content, tags)
      return `已保存文档「${args.title}」`
    } catch (err) {
      return `保存文档失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docCloseTool: AITool = {
  name: 'doc.close',
  description: '关闭当前正在编辑的文档',
  parameters: {},
  execute: async () => {
    try {
      const store = useNoteStore.getState()
      if (!store.editingDocId) return '当前没有打开的文档'
      const title = store.editingDocTitle
      store.closeDoc()
      return `已关闭文档「${title}」`
    } catch (err) {
      return `关闭文档失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docSearchTool: AITool = {
  name: 'doc.search',
  description: '搜索文档（按标题或内容关键词）',
  parameters: {
    query: { type: 'string', description: '搜索关键词', required: true },
  },
  execute: async (args) => {
    try {
      const q = args.query.toLowerCase()
      const docs = await db.docs.toArray()
      const results = docs.filter(d =>
        d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)
      )
      if (results.length === 0) return `未找到与「${args.query}」相关的文档`
      const lines = results.slice(0, 10).map(d =>
        `- [·] ${d.title || '未命名'}（ID: ${d.id}）`
      )
      return `找到 ${results.length} 篇相关文档：\n${lines.join('\n')}`
    } catch (err) {
      return `搜索文档失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docAddLinkTool: AITool = {
  name: 'doc.add_link',
  description: '为文档添加链接关系',
  parameters: {
    sourceDocId: { type: 'string', description: '源文档ID', required: true },
    targetDocId: { type: 'string', description: '目标文档ID', required: true },
    type: { type: 'string', description: '链接类型: reference, related, depends_on, extends, contradicts', required: true },
    description: { type: 'string', description: '链接描述' },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.addDocLink(args.sourceDocId, args.targetDocId, args.type as any, args.description)
      return `已添加文档链接：${args.sourceDocId} → ${args.targetDocId}（${args.type}）`
    } catch (err) {
      return `添加链接失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const docRemoveLinkTool: AITool = {
  name: 'doc.remove_link',
  description: '删除文档链接',
  parameters: {
    linkId: { type: 'string', description: '链接ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNoteStore.getState()
      await store.removeDocLink(args.linkId)
      return `已删除文档链接`
    } catch (err) {
      return `删除链接失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationAddTool: AITool = {
  name: 'inspiration.add',
  description: '添加灵感记录',
  parameters: {
    title: { type: 'string', description: '灵感标题', required: true },
    content: { type: 'string', description: '灵感内容', required: true },
    source: { type: 'string', description: '来源: manual, clipboard, share, douyin, wechat' },
    sourceUrl: { type: 'string', description: '来源URL' },
    categoryId: { type: 'string', description: '分类ID' },
    tags: { type: 'string', description: '标签，逗号分隔' },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      const item = await store.addInspiration({
        title: args.title,
        content: args.content,
        source: (args.source as any) ?? 'manual',
        sourceUrl: args.sourceUrl,
        categoryId: args.categoryId,
        tags: args.tags ? args.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      })
      return `已添加灵感「${args.title}」（ID: ${item.id}）`
    } catch (err) {
      return `添加灵感失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationAddStickyTool: AITool = {
  name: 'inspiration.add_sticky',
  description: '快速添加便利贴',
  parameters: {
    content: { type: 'string', description: '便利贴内容', required: true },
    color: { type: 'string', description: '颜色: yellow, blue, pink, green, orange, purple' },
    tags: { type: 'string', description: '标签，逗号分隔' },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      const item = await store.addStickyNote({
        content: args.content,
        color: (args.color as any) ?? 'yellow',
        tags: args.tags ? args.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
      })
      return `已创建便利贴「${args.content.slice(0, 30)}${args.content.length > 30 ? '...' : ''}」（ID: ${item.id}）`
    } catch (err) {
      return `创建便利贴失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationUpdateTool: AITool = {
  name: 'inspiration.update',
  description: '更新灵感记录',
  parameters: {
    id: { type: 'string', description: '灵感ID', required: true },
    title: { type: 'string', description: '新标题' },
    content: { type: 'string', description: '新内容' },
    color: { type: 'string', description: '新颜色' },
    tags: { type: 'string', description: '新标签，逗号分隔' },
    categoryId: { type: 'string', description: '新分类ID' },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      const updates: Record<string, any> = {}
      if (args.title !== undefined) updates.title = args.title
      if (args.content !== undefined) updates.content = args.content
      if (args.color !== undefined) updates.color = args.color
      if (args.tags !== undefined) updates.tags = args.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
      if (args.categoryId !== undefined) updates.categoryId = args.categoryId
      await store.updateItem(args.id, updates)
      return `已更新灵感记录`
    } catch (err) {
      return `更新灵感失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationDeleteTool: AITool = {
  name: 'inspiration.delete',
  description: '删除灵感记录',
  parameters: {
    id: { type: 'string', description: '灵感ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      await store.deleteItem(args.id)
      return `已删除灵感记录`
    } catch (err) {
      return `删除灵感失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationListTool: AITool = {
  name: 'inspiration.list',
  description: '列出灵感记录和便利贴',
  parameters: {
    categoryId: { type: 'string', description: '按分类ID筛选' },
    searchQuery: { type: 'string', description: '搜索关键词' },
    limit: { type: 'number', description: '返回数量限制，默认20' },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      let items = store.items
      if (args.categoryId) items = items.filter(i => i.categoryId === args.categoryId)
      if (args.searchQuery) {
        const q = args.searchQuery.toLowerCase()
        items = items.filter(i =>
          i.title.toLowerCase().includes(q) || i.content.toLowerCase().includes(q)
        )
      }
      if (items.length === 0) return '暂无灵感记录'
      const limit = args.limit ?? 20
      const lines = items.slice(0, limit).map(i => {
        const statusIcon = i.status === 'read' ? '[◉]' : '🆕'
        const favIcon = i.isFavorite ? '[♥]' : ''
        const pinIcon = i.isPinned ? '[↑]' : ''
        return `- ${statusIcon}${favIcon}${pinIcon} ${i.title}（${i.source}，ID: ${i.id}）`
      })
      return `共 ${items.length} 条灵感记录：\n${lines.join('\n')}`
    } catch (err) {
      return `获取灵感列表失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationToggleFavoriteTool: AITool = {
  name: 'inspiration.toggle_favorite',
  description: '切换灵感的收藏状态',
  parameters: {
    id: { type: 'string', description: '灵感ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      const item = store.items.find(i => i.id === args.id)
      if (!item) return `未找到ID为 ${args.id} 的灵感`
      await store.toggleFavorite(args.id)
      return item.isFavorite ? `已取消收藏「${item.title}」` : `已收藏「${item.title}」[♥]`
    } catch (err) {
      return `切换收藏失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationTogglePinTool: AITool = {
  name: 'inspiration.toggle_pin',
  description: '切换灵感的置顶状态',
  parameters: {
    id: { type: 'string', description: '灵感ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      const item = store.items.find(i => i.id === args.id)
      if (!item) return `未找到ID为 ${args.id} 的灵感`
      await store.togglePin(args.id)
      return item.isPinned ? `已取消置顶「${item.title}」` : `已置顶「${item.title}」[↑]`
    } catch (err) {
      return `切换置顶失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationMarkReadTool: AITool = {
  name: 'inspiration.mark_read',
  description: '将灵感标记为已读',
  parameters: {
    id: { type: 'string', description: '灵感ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      const item = store.items.find(i => i.id === args.id)
      if (!item) return `未找到ID为 ${args.id} 的灵感`
      await store.markRead(args.id)
      return `已将「${item.title}」标记为已读`
    } catch (err) {
      return `标记已读失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const inspirationImportClipboardTool: AITool = {
  name: 'inspiration.import_clipboard',
  description: '从剪贴板导入灵感',
  parameters: {},
  execute: async () => {
    try {
      const store = useInspirationStickyStore.getState()
      const item = await store.importFromClipboard()
      if (!item) return '剪贴板为空，无法导入'
      return `已从剪贴板导入灵感「${item.title}」（ID: ${item.id}）`
    } catch (err) {
      return `导入剪贴板失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const categoryCreateTool: AITool = {
  name: 'category.create',
  description: '创建灵感分类',
  parameters: {
    name: { type: 'string', description: '分类名称', required: true },
    icon: { type: 'string', description: '分类图标，如 [※]' },
    color: { type: 'string', description: '分类颜色，如 #FF5733' },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      const category = await store.createCategory(args.name, args.icon ?? '[※]', args.color ?? '#6366f1')
      return `已创建分类「${args.name}」（ID: ${category.id}）`
    } catch (err) {
      return `创建分类失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const categoryRenameTool: AITool = {
  name: 'category.rename',
  description: '重命名灵感分类',
  parameters: {
    id: { type: 'string', description: '分类ID', required: true },
    name: { type: 'string', description: '新名称', required: true },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      await store.renameCategory(args.id, args.name)
      return `已重命名分类为「${args.name}」`
    } catch (err) {
      return `重命名分类失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const categoryDeleteTool: AITool = {
  name: 'category.delete',
  description: '删除灵感分类',
  parameters: {
    id: { type: 'string', description: '分类ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useInspirationStickyStore.getState()
      await store.deleteCategory(args.id)
      return `已删除分类`
    } catch (err) {
      return `删除分类失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const categoryListTool: AITool = {
  name: 'category.list',
  description: '列出所有灵感分类',
  parameters: {},
  execute: async () => {
    try {
      const store = useInspirationStickyStore.getState()
      if (store.categories.length === 0) return '暂无分类'
      const lines = store.categories.map(c => {
        const count = store.items.filter(i => i.categoryId === c.id).length
        return `- ${c.icon} ${c.name}（${count}条灵感，ID: ${c.id}）`
      })
      return `共 ${store.categories.length} 个分类：\n${lines.join('\n')}`
    } catch (err) {
      return `获取分类列表失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const reminderCreateTool: AITool = {
  name: 'reminder.create',
  description: '为任务创建提醒',
  parameters: {
    taskId: { type: 'string', description: '任务ID', required: true },
    type: { type: 'string', description: '提醒类型: once(单次), progressive(递进), persistent(强提醒)', required: true },
    triggerAt: { type: 'string', description: '提醒时间，ISO格式如 2025-05-25T15:00:00', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNotificationStore.getState()
      const taskStore = useTaskStore.getState()
      const task = taskStore.getTaskById(args.taskId)
      if (!task) return `未找到ID为 ${args.taskId} 的任务`
      const reminder = await store.createReminder({
        taskId: args.taskId,
        type: args.type as any,
        triggerAt: args.triggerAt,
      })
      const typeLabels: Record<string, string> = { once: '单次提醒', progressive: '递进提醒', persistent: '强提醒' }
      return `已为任务「${task.title}」创建${typeLabels[args.type] || '提醒'}，将于 ${args.triggerAt} 触发（提醒ID: ${reminder.id}）`
    } catch (err) {
      return `创建提醒失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const reminderUpdateTool: AITool = {
  name: 'reminder.update',
  description: '更新提醒',
  parameters: {
    id: { type: 'string', description: '提醒ID', required: true },
    type: { type: 'string', description: '新提醒类型: once, progressive, persistent' },
    triggerAt: { type: 'string', description: '新提醒时间，ISO格式' },
  },
  execute: async (args) => {
    try {
      const store = useNotificationStore.getState()
      const updates: Record<string, any> = {}
      if (args.type !== undefined) updates.type = args.type
      if (args.triggerAt !== undefined) updates.triggerAt = args.triggerAt
      await store.updateReminder(args.id, updates)
      return `已更新提醒`
    } catch (err) {
      return `更新提醒失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const reminderDeleteTool: AITool = {
  name: 'reminder.delete',
  description: '删除提醒',
  parameters: {
    id: { type: 'string', description: '提醒ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNotificationStore.getState()
      await store.deleteReminder(args.id)
      return `已删除提醒`
    } catch (err) {
      return `删除提醒失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const reminderListTool: AITool = {
  name: 'reminder.list',
  description: '列出提醒，可按任务筛选',
  parameters: {
    taskId: { type: 'string', description: '按任务ID筛选' },
    showTriggered: { type: 'boolean', description: '是否包含已触发的提醒，默认false' },
  },
  execute: async (args) => {
    try {
      const store = useNotificationStore.getState()
      let reminders = store.reminders
      if (args.taskId) reminders = reminders.filter(r => r.taskId === args.taskId)
      if (!args.showTriggered) reminders = reminders.filter(r => !r.isTriggered)
      if (reminders.length === 0) return '没有找到匹配的提醒'
      const typeLabels: Record<string, string> = { once: '单次', progressive: '递进', persistent: '强提醒' }
      const lines = reminders.slice(0, 20).map(r =>
        `- ${typeLabels[r.type] || r.type} ${r.triggerAt}${r.isTriggered ? ' [✓]已触发' : ''}（任务: ${r.taskId.slice(0, 8)}...，ID: ${r.id}）`
      )
      return `共 ${reminders.length} 个提醒：\n${lines.join('\n')}`
    } catch (err) {
      return `获取提醒列表失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const reminderSnoozeTool: AITool = {
  name: 'reminder.snooze',
  description: '贪睡/延后提醒',
  parameters: {
    id: { type: 'string', description: '提醒ID', required: true },
    minutes: { type: 'number', description: '延后分钟数', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNotificationStore.getState()
      await store.snoozeReminder(args.id, args.minutes)
      return `已将提醒延后 ${args.minutes} 分钟`
    } catch (err) {
      return `延后提醒失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const reminderDismissTool: AITool = {
  name: 'reminder.dismiss',
  description: '关闭/忽略提醒',
  parameters: {
    id: { type: 'string', description: '提醒ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useNotificationStore.getState()
      await store.dismissReminder(args.id)
      return `已关闭提醒`
    } catch (err) {
      return `关闭提醒失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const attachmentAddTool: AITool = {
  name: 'attachment.add',
  description: '为任务添加附件',
  parameters: {
    taskId: { type: 'string', description: '任务ID', required: true },
    type: { type: 'string', description: '附件类型: file, link, image, local_path', required: true },
    name: { type: 'string', description: '附件名称', required: true },
    url: { type: 'string', description: '附件URL或路径', required: true },
    size: { type: 'number', description: '附件大小（字节）' },
  },
  execute: async (args) => {
    try {
      const store = useAttachmentStore.getState()
      const attachment = await store.addAttachment({
        taskId: args.taskId,
        type: args.type as any,
        name: args.name,
        url: args.url,
        size: args.size ?? 0,
      })
      return `已添加附件「${args.name}」（ID: ${attachment.id}）`
    } catch (err) {
      return `添加附件失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const attachmentRemoveTool: AITool = {
  name: 'attachment.remove',
  description: '删除附件',
  parameters: {
    id: { type: 'string', description: '附件ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useAttachmentStore.getState()
      await store.removeAttachment(args.id)
      return `已删除附件`
    } catch (err) {
      return `删除附件失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const attachmentListTool: AITool = {
  name: 'attachment.list',
  description: '列出任务的附件',
  parameters: {
    taskId: { type: 'string', description: '任务ID', required: true },
  },
  execute: async (args) => {
    try {
      const store = useAttachmentStore.getState()
      const attachments = store.getAttachmentsByTask(args.taskId)
      if (attachments.length === 0) return '该任务没有附件'
      const lines = attachments.map(a => {
        const typeIcon: Record<string, string> = { file: '[†]', link: '[→]', image: '[▣]', local_path: '[▸]' }
        return `- ${typeIcon[a.type] || '[†]'} ${a.name}（${a.type}，ID: ${a.id}）`
      })
      return `共 ${attachments.length} 个附件：\n${lines.join('\n')}`
    } catch (err) {
      return `获取附件列表失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const statsSummaryTool: AITool = {
  name: 'stats.summary',
  description: '获取任务统计摘要',
  parameters: {},
  execute: async () => {
    try {
      const store = useTaskStore.getState()
      const tasks = store.tasks
      const total = tasks.length
      const completed = tasks.filter(t => t.status === 'completed').length
      const inProgress = tasks.filter(t => t.status === 'in_progress').length
      const pending = tasks.filter(t => t.status === 'pending').length
      const cancelled = tasks.filter(t => t.status === 'cancelled').length
      const today = toISODateString(new Date())
      const overdue = tasks.filter(t =>
        t.status !== 'completed' && t.status !== 'cancelled' &&
        t.dueDate && t.dueDate < today && !t.isMigrated
      ).length
      const important = tasks.filter(t => t.isImportant && t.status !== 'completed').length
      const totalEstimated = tasks.reduce((s, t) => s + t.estimatedMinutes, 0)
      const totalActual = tasks.reduce((s, t) => s + t.actualMinutes, 0)
      return [
        `[#] 任务统计：`,
        `  总计：${total}`,
        `  待办：${pending}`,
        `  进行中：${inProgress}`,
        `  已完成：${completed}`,
        `  已取消：${cancelled}`,
        `  逾期：${overdue}`,
        `  重要：${important}`,
        `  完成率：${total > 0 ? Math.round((completed / total) * 100) : 0}%`,
        `  预估总耗时：${totalEstimated}分钟`,
        `  实际总耗时：${totalActual}分钟`,
      ].join('\n')
    } catch (err) {
      return `获取统计失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const statsTodaySummaryTool: AITool = {
  name: 'stats.today_summary',
  description: '获取今日任务摘要',
  parameters: {},
  execute: async () => {
    try {
      const store = useTaskStore.getState()
      const today = toISODateString(new Date())
      const tasks = store.tasks
      const todayTasks = tasks.filter(t =>
        t.status !== 'cancelled' &&
        (t.dueDate === today || t.isMigrated)
      )
      const completedToday = todayTasks.filter(t => t.status === 'completed')
      const pendingToday = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress')
      const overdue = tasks.filter(t =>
        t.status !== 'completed' && t.status !== 'cancelled' &&
        t.dueDate && t.dueDate < today && !t.isMigrated
      )
      let summary = `[日] 今日摘要（${today}）：\n`
      summary += `  今日任务：${todayTasks.length} 个\n`
      summary += `  已完成：${completedToday.length} 个\n`
      summary += `  待完成：${pendingToday.length} 个\n`
      if (overdue.length > 0) {
        summary += `  [!] 逾期任务：${overdue.length} 个\n`
      }
      if (pendingToday.length > 0) {
        summary += `\n待完成任务：\n`
        pendingToday.slice(0, 10).forEach(t => {
          summary += `  - ${t.title}（${t.priority}）\n`
        })
      }
      return summary.trim()
    } catch (err) {
      return `获取今日摘要失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const statsWeeklyReportTool: AITool = {
  name: 'stats.weekly_report',
  description: '生成周报',
  parameters: {},
  execute: async () => {
    try {
      const store = useStatisticsStore.getState()
      const report = await store.getWeeklyReport()
      if (!report) return '生成周报失败'
      return [
        `[#] 周报：${report.weekStart} ~ ${report.weekEnd}`,
        ``,
        `总览：`,
        `  任务总数：${report.stats.totalTasks}`,
        `  已完成：${report.stats.completedTasks}`,
        `  完成率：${report.stats.completionRate}%`,
        `  进行中：${report.stats.inProgressTasks}`,
        `  逾期：${report.stats.overdueTasks}`,
        `  专注时长：${report.totalFocusMinutes}分钟`,
        `  连续天数：${report.streakDays}天`,
        ``,
        `优先级分布：`,
        `  [!] 紧急：${report.priorityDistribution.urgent}`,
        `  [-] 高：${report.priorityDistribution.high}`,
        `  [·] 中：${report.priorityDistribution.medium}`,
        `  [○] 低：${report.priorityDistribution.low}`,
      ].join('\n')
    } catch (err) {
      return `生成周报失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const statsExportTool: AITool = {
  name: 'stats.export',
  description: '导出统计报告（markdown、csv或html格式）',
  parameters: {
    format: { type: 'string', description: '导出格式: markdown, csv, html', required: true },
    includeDailySnapshots: { type: 'boolean', description: '是否包含每日快照，默认true' },
    includePriority: { type: 'boolean', description: '是否包含优先级分布，默认true' },
  },
  execute: async (args) => {
    try {
      const store = useStatisticsStore.getState()
      await store.exportReport({
        format: (args.format as any) ?? 'markdown',
        dateRange: { start: '', end: '' },
        includeHeatmap: false,
        includePriority: args.includePriority ?? true,
        includeDailySnapshots: args.includeDailySnapshots ?? true,
      })
      return `已导出${args.format || 'markdown'}格式报告`
    } catch (err) {
      return `导出报告失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsGetTool: AITool = {
  name: 'settings.get',
  description: '获取当前应用设置',
  parameters: {},
  execute: async () => {
    try {
      const store = useSettingsStore.getState()
      const s = store.settings
      return [
        `[⚙] 应用设置：`,
        `  主题：${s.theme}`,
        `  语言：${s.language}`,
        `  开机自启：${s.autoStart ? '是' : '否'}`,
        `  默认视图：${s.defaultView}`,
        `  免打扰：${s.dndEnabled ? `是（${s.dndStart}-${s.dndEnd}）` : '否'}`,
        `  每日目标：${s.dailyTarget}个`,
        `  缓冲时间：${s.bufferTimePercent}%`,
        `  宽恕次数：${s.forgivenessCount}`,
        `  关闭到托盘：${s.closeToTray ? '是' : '否'}`,
        `  浮动窗口：${s.floatingWindowEnabled ? '是' : '否'}`,
        `  快捷键：${Object.entries(s.hotkeys).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      ].join('\n')
    } catch (err) {
      return `获取设置失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetThemeTool: AITool = {
  name: 'settings.set_theme',
  description: '设置应用主题',
  parameters: {
    theme: { type: 'string', description: '主题: light, dark, system', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setTheme(args.theme as any)
      const labels: Record<string, string> = { light: '浅色', dark: '深色', system: '跟随系统' }
      return `已切换为${labels[args.theme] || args.theme}主题`
    } catch (err) {
      return `设置主题失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetLanguageTool: AITool = {
  name: 'settings.set_language',
  description: '设置应用语言',
  parameters: {
    language: { type: 'string', description: '语言代码，如 zh-CN, en-US', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setLanguage(args.language)
      return `已设置语言为 ${args.language}`
    } catch (err) {
      return `设置语言失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetDefaultViewTool: AITool = {
  name: 'settings.set_default_view',
  description: '设置默认视图',
  parameters: {
    view: { type: 'string', description: '视图: list, calendar, kanban, timeline', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setDefaultView(args.view as any)
      return `已设置默认视图为 ${args.view}`
    } catch (err) {
      return `设置默认视图失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetDailyTargetTool: AITool = {
  name: 'settings.set_daily_target',
  description: '设置每日完成任务目标数',
  parameters: {
    count: { type: 'number', description: '每日目标数量', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setDailyTarget(args.count)
      return `已设置每日目标为 ${args.count} 个任务`
    } catch (err) {
      return `设置每日目标失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetDndTool: AITool = {
  name: 'settings.set_dnd',
  description: '设置免打扰模式',
  parameters: {
    enabled: { type: 'boolean', description: '是否启用免打扰', required: true },
    start: { type: 'string', description: '免打扰开始时间，如 22:00' },
    end: { type: 'string', description: '免打扰结束时间，如 08:00' },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setDndEnabled(args.enabled)
      if (args.start && args.end) {
        store.setDndTime(args.start, args.end)
      }
      return args.enabled
        ? `已启用免打扰模式${args.start ? `（${args.start}-${args.end}）` : ''}`
        : '已关闭免打扰模式'
    } catch (err) {
      return `设置免打扰失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetHotkeyTool: AITool = {
  name: 'settings.set_hotkey',
  description: '设置快捷键',
  parameters: {
    action: { type: 'string', description: '快捷键动作: newTask, search, toggleSidebar, quickCapture, goToday', required: true },
    key: { type: 'string', description: '快捷键组合，如 Ctrl+N', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setHotkey(args.action, args.key)
      return `已设置快捷键 ${args.action} = ${args.key}`
    } catch (err) {
      return `设置快捷键失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetAutoStartTool: AITool = {
  name: 'settings.set_auto_start',
  description: '设置是否开机自启',
  parameters: {
    enabled: { type: 'boolean', description: '是否启用开机自启', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setAutoStart(args.enabled)
      return args.enabled ? '已启用开机自启' : '已关闭开机自启'
    } catch (err) {
      return `设置开机自启失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetCloseToTrayTool: AITool = {
  name: 'settings.set_close_to_tray',
  description: '设置关闭时是否最小化到托盘',
  parameters: {
    enabled: { type: 'boolean', description: '是否启用关闭到托盘', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setCloseToTray(args.enabled)
      return args.enabled ? '已启用关闭到托盘' : '已关闭关闭到托盘'
    } catch (err) {
      return `设置关闭到托盘失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsSetFloatingWindowTool: AITool = {
  name: 'settings.set_floating_window',
  description: '设置是否启用浮动窗口',
  parameters: {
    enabled: { type: 'boolean', description: '是否启用浮动窗口', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSettingsStore.getState()
      store.setFloatingWindowEnabled(args.enabled)
      return args.enabled ? '已启用浮动窗口' : '已关闭浮动窗口'
    } catch (err) {
      return `设置浮动窗口失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const settingsResetTool: AITool = {
  name: 'settings.reset',
  description: '重置所有设置为默认值',
  parameters: {},
  execute: async () => {
    try {
      const store = useSettingsStore.getState()
      store.resetToDefaults()
      return '已重置所有设置为默认值'
    } catch (err) {
      return `重置设置失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const securitySetPrivacyModeTool: AITool = {
  name: 'security.set_privacy_mode',
  description: '设置隐私模式',
  parameters: {
    enabled: { type: 'boolean', description: '是否启用隐私模式', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSecurityStore.getState()
      store.setPrivacyMode(args.enabled)
      return args.enabled ? '已启用隐私模式' : '已关闭隐私模式'
    } catch (err) {
      return `设置隐私模式失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const securitySetLocalOnlyTool: AITool = {
  name: 'security.set_local_only',
  description: '设置仅本地存储模式',
  parameters: {
    enabled: { type: 'boolean', description: '是否启用仅本地模式', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSecurityStore.getState()
      store.setLocalOnly(args.enabled)
      return args.enabled ? '已启用仅本地存储' : '已关闭仅本地存储'
    } catch (err) {
      return `设置仅本地模式失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const securitySetEncryptionTool: AITool = {
  name: 'security.set_encryption',
  description: '设置数据加密',
  parameters: {
    enabled: { type: 'boolean', description: '是否启用加密', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSecurityStore.getState()
      store.setEncryption(args.enabled)
      return args.enabled ? '已启用数据加密' : '已关闭数据加密'
    } catch (err) {
      return `设置加密失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const securitySetPasswordTool: AITool = {
  name: 'security.set_password',
  description: '设置应用密码',
  parameters: {
    password: { type: 'string', description: '新密码', required: true },
  },
  execute: async (args) => {
    try {
      const store = useSecurityStore.getState()
      await store.setPassword(args.password)
      return '已设置应用密码'
    } catch (err) {
      return `设置密码失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const securityLockTool: AITool = {
  name: 'security.lock',
  description: '锁定应用（需要密码才能解锁）',
  parameters: {},
  execute: async () => {
    try {
      const store = useSecurityStore.getState()
      store.lock()
      return '已锁定应用'
    } catch (err) {
      return `锁定失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const viewSwitchTool: AITool = {
  name: 'view.switch',
  description: '切换视图模式',
  parameters: {
    view: { type: 'string', description: '视图: list, calendar, kanban, timeline', required: true },
  },
  execute: async (args) => {
    try {
      const store = useViewStore.getState()
      store.setCurrentView(args.view as any)
      const labels: Record<string, string> = { list: '列表', calendar: '日历', kanban: '看板', timeline: '时间线' }
      return `已切换到${labels[args.view] || args.view}视图`
    } catch (err) {
      return `切换视图失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const viewSwitchCalendarTool: AITool = {
  name: 'view.switch_calendar',
  description: '切换日历子视图',
  parameters: {
    view: { type: 'string', description: '日历视图: day, week, month', required: true },
  },
  execute: async (args) => {
    try {
      const store = useViewStore.getState()
      store.setCalendarView(args.view as any)
      const labels: Record<string, string> = { day: '日', week: '周', month: '月' }
      return `已切换到${labels[args.view] || args.view}视图`
    } catch (err) {
      return `切换日历视图失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const viewSwitchTabTool: AITool = {
  name: 'view.switch_tab',
  description: '切换侧边栏标签页',
  parameters: {
    tab: { type: 'string', description: '标签页: today, important, tasks, inspirationSticky, knowledge, calendar, statistics, settings', required: true },
  },
  execute: async (args) => {
    try {
      const store = useViewStore.getState()
      store.setActiveTab(args.tab as any)
      const labels: Record<string, string> = {
        today: '今日', important: '重要', tasks: '任务',
        inspirationSticky: '灵感', knowledge: '知识库',
        calendar: '日历', statistics: '统计', settings: '设置',
      }
      return `已切换到${labels[args.tab] || args.tab}标签页`
    } catch (err) {
      return `切换标签页失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const viewToggleSidebarTool: AITool = {
  name: 'view.toggle_sidebar',
  description: '切换侧边栏展开/折叠',
  parameters: {},
  execute: async () => {
    try {
      const store = useViewStore.getState()
      store.toggleSidebar()
      const collapsed = useViewStore.getState().isSidebarCollapsed
      return collapsed ? '已折叠侧边栏' : '已展开侧边栏'
    } catch (err) {
      return `切换侧边栏失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const viewSelectDateTool: AITool = {
  name: 'view.select_date',
  description: '选择日期（切换到指定日期的视图）',
  parameters: {
    date: { type: 'string', description: '日期，格式 YYYY-MM-DD，或 today/tomorrow/yesterday', required: true },
  },
  execute: async (args) => {
    try {
      const store = useViewStore.getState()
      let dateStr = args.date
      if (args.date === 'today') dateStr = toISODateString(new Date())
      else if (args.date === 'tomorrow') {
        const d = new Date()
        d.setDate(d.getDate() + 1)
        dateStr = toISODateString(d)
      } else if (args.date === 'yesterday') {
        const d = new Date()
        d.setDate(d.getDate() - 1)
        dateStr = toISODateString(d)
      }
      store.setSelectedDate(dateStr)
      return `已选择日期 ${dateStr}`
    } catch (err) {
      return `选择日期失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const petSetLLMConfigTool: AITool = {
  name: 'pet.set_llm_config',
  description: '设置桌宠的LLM配置',
  parameters: {
    endpoint: { type: 'string', description: 'LLM端点地址，如 http://localhost:11434' },
    model: { type: 'string', description: '模型名称，如 qwen2.5:7b' },
  },
  execute: async (args) => {
    try {
      const { usePetStore } = await import('./store')
      const store = usePetStore.getState()
      store.setLLMConfig(
        args.endpoint ?? store.llmEndpoint,
        args.model ?? store.llmModel,
      )
      return `已设置LLM：${args.endpoint ?? store.llmEndpoint} / ${args.model ?? store.llmModel}`
    } catch (err) {
      return `设置LLM配置失败：${err instanceof Error ? err.message : String(err)}`
    }
  },
}

const helpTool: AITool = {
  name: 'help',
  description: '获取帮助信息，列出所有可用的命令和功能',
  parameters: {
    category: { type: 'string', description: '命令分类: task, group, kb, folder, doc, inspiration, category, reminder, attachment, stats, settings, security, view, pet' },
  },
  execute: async (args) => {
    const categories: Record<string, string[]> = {
      task: [
        'task.create - 创建任务',
        'task.create_natural - 自然语言创建任务',
        'task.update - 更新任务',
        'task.delete - 删除任务',
        'task.complete - 完成任务',
        'task.uncomplete - 恢复任务',
        'task.cancel - 取消任务',
        'task.start - 开始任务',
        'task.list - 列出任务',
        'task.get - 获取任务详情',
        'task.set_important - 设置重要性',
        'task.update_progress - 更新进度',
        'task.decompose - 分解子任务',
        'task.migrate_overdue - 迁移逾期任务',
        'task.search - 搜索任务',
      ],
      group: [
        'group.create - 创建分组',
        'group.update - 更新分组',
        'group.delete - 删除分组',
        'group.list - 列出分组',
      ],
      kb: [
        'kb.create - 创建知识库',
        'kb.rename - 重命名知识库',
        'kb.delete - 删除知识库',
        'kb.list - 列出知识库',
      ],
      folder: [
        'folder.create - 创建文件夹',
        'folder.rename - 重命名文件夹',
        'folder.delete - 删除文件夹',
      ],
      doc: [
        'doc.create - 创建文档',
        'doc.delete - 删除文档',
        'doc.open - 打开文档',
        'doc.save - 保存文档',
        'doc.close - 关闭文档',
        'doc.search - 搜索文档',
        'doc.add_link - 添加文档链接',
        'doc.remove_link - 删除文档链接',
      ],
      inspiration: [
        'inspiration.add - 添加灵感',
        'inspiration.add_sticky - 添加便利贴',
        'inspiration.update - 更新灵感',
        'inspiration.delete - 删除灵感',
        'inspiration.list - 列出灵感',
        'inspiration.toggle_favorite - 切换收藏',
        'inspiration.toggle_pin - 切换置顶',
        'inspiration.mark_read - 标记已读',
        'inspiration.complete - 标记完成',
        'inspiration.import_clipboard - 从剪贴板导入',
      ],
      category: [
        'category.create - 创建分类',
        'category.rename - 重命名分类',
        'category.delete - 删除分类',
        'category.list - 列出分类',
      ],
      reminder: [
        'reminder.create - 创建提醒',
        'reminder.update - 更新提醒',
        'reminder.delete - 删除提醒',
        'reminder.list - 列出提醒',
        'reminder.snooze - 延后提醒',
        'reminder.dismiss - 关闭提醒',
      ],
      attachment: [
        'attachment.add - 添加附件',
        'attachment.remove - 删除附件',
        'attachment.list - 列出附件',
      ],
      stats: [
        'stats.summary - 统计摘要',
        'stats.today_summary - 今日摘要',
        'stats.weekly_report - 周报',
        'stats.export - 导出报告',
      ],
      settings: [
        'settings.get - 获取设置',
        'settings.set_theme - 设置主题',
        'settings.set_language - 设置语言',
        'settings.set_default_view - 设置默认视图',
        'settings.set_daily_target - 设置每日目标',
        'settings.set_dnd - 设置免打扰',
        'settings.set_hotkey - 设置快捷键',
        'settings.set_auto_start - 设置开机自启',
        'settings.set_close_to_tray - 设置关闭到托盘',
        'settings.set_floating_window - 设置浮动窗口',
        'settings.reset - 重置设置',
      ],
      security: [
        'security.set_privacy_mode - 设置隐私模式',
        'security.set_local_only - 设置仅本地',
        'security.set_encryption - 设置加密',
        'security.set_password - 设置密码',
        'security.lock - 锁定应用',
      ],
      view: [
        'view.switch - 切换视图',
        'view.switch_calendar - 切换日历视图',
        'view.switch_tab - 切换标签页',
        'view.toggle_sidebar - 切换侧边栏',
        'view.select_date - 选择日期',
      ],
      pet: [
        'pet.set_llm_config - 设置LLM配置',
      ],
    }
    if (args.category && categories[args.category]) {
      return `${args.category} 命令列表：\n${categories[args.category].map(c => `  ${c}`).join('\n')}`
    }
    const allLines = Object.entries(categories).map(([cat, cmds]) => {
      return `\n【${cat}】\n${cmds.map(c => `  ${c}`).join('\n')}`
    })
    return `所有可用命令：${allLines.join('\n')}`
  },
}

export function getAllTools(): AITool[] {
  return [
    taskCreateTool,
    taskCreateNLTool,
    taskUpdateTool,
    taskDeleteTool,
    taskCompleteTool,
    taskUncompleteTool,
    taskCancelTool,
    taskStartTool,
    taskListTool,
    taskGetTool,
    taskSetImportantTool,
    taskUpdateProgressTool,
    taskDecomposeTool,
    taskMigrateTool,
    taskSearchTool,
    groupCreateTool,
    groupUpdateTool,
    groupDeleteTool,
    groupListTool,
    kbCreateTool,
    kbRenameTool,
    kbDeleteTool,
    kbListTool,
    folderCreateTool,
    folderRenameTool,
    folderDeleteTool,
    docCreateTool,
    docDeleteTool,
    docOpenTool,
    docSaveTool,
    docCloseTool,
    docSearchTool,
    docAddLinkTool,
    docRemoveLinkTool,
    inspirationAddTool,
    inspirationAddStickyTool,
    inspirationUpdateTool,
    inspirationDeleteTool,
    inspirationListTool,
    inspirationToggleFavoriteTool,
    inspirationTogglePinTool,
    inspirationMarkReadTool,
    inspirationImportClipboardTool,
    categoryCreateTool,
    categoryRenameTool,
    categoryDeleteTool,
    categoryListTool,
    reminderCreateTool,
    reminderUpdateTool,
    reminderDeleteTool,
    reminderListTool,
    reminderSnoozeTool,
    reminderDismissTool,
    attachmentAddTool,
    attachmentRemoveTool,
    attachmentListTool,
    statsSummaryTool,
    statsTodaySummaryTool,
    statsWeeklyReportTool,
    statsExportTool,
    settingsGetTool,
    settingsSetThemeTool,
    settingsSetLanguageTool,
    settingsSetDefaultViewTool,
    settingsSetDailyTargetTool,
    settingsSetDndTool,
    settingsSetHotkeyTool,
    settingsSetAutoStartTool,
    settingsSetCloseToTrayTool,
    settingsSetFloatingWindowTool,
    settingsResetTool,
    securitySetPrivacyModeTool,
    securitySetLocalOnlyTool,
    securitySetEncryptionTool,
    securitySetPasswordTool,
    securityLockTool,
    viewSwitchTool,
    viewSwitchCalendarTool,
    viewSwitchTabTool,
    viewToggleSidebarTool,
    viewSelectDateTool,
    petSetLLMConfigTool,
    helpTool,
  ]
}

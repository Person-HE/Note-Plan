import { db, clearAllData } from '@/core/database'
import { generateId, toISODateString, toISODateTimeString } from '@/shared'
import { htmlToChunkRecords, resolveDocLinks } from '@/modules/note/chunker'

const today = toISODateString(new Date())
const tomorrow = toISODateString(new Date(Date.now() + 86400000))
const yesterday = toISODateString(new Date(Date.now() - 86400000))
const twoDaysAgo = toISODateString(new Date(Date.now() - 86400000 * 2))

const SEED_VERSION = 7

export async function seedTestData(): Promise<void> {
  const versionSetting = await db.settings.get('seedVersion')
  const currentVersion = versionSetting ? parseInt(versionSetting.value, 10) : 0

  if (currentVersion >= SEED_VERSION) {
    console.log('[Seed] 数据已是最新版本，跳过注入')
    return
  }

  console.log('[Seed] 检测到旧版本数据，清除并重新注入...')
  await clearAllData()

  const workGroupId = generateId()
  const personalGroupId = generateId()
  const studyGroupId = generateId()

  await db.groups.bulkAdd([
    { id: workGroupId, name: '工作', color: '#3b82f6', icon: 'briefcase', parentId: null, order: 0, createdAt: new Date().toISOString() },
    { id: personalGroupId, name: '个人', color: '#10b981', icon: 'home', parentId: null, order: 1, createdAt: new Date().toISOString() },
    { id: studyGroupId, name: '学习', color: '#8b5cf6', icon: 'book', parentId: null, order: 2, createdAt: new Date().toISOString() },
  ])

  const now = new Date().toISOString()

  const tasks = [
    { id: generateId(), title: '完成季度项目汇报', description: '整理Q2项目数据，制作PPT演示文稿', status: 'in_progress' as const, priority: 'urgent' as const, progress: 60, parentId: null, groupId: workGroupId, dueDate: today, dueTime: '17:00', reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: true, isMigrated: false, estimatedMinutes: 120, actualMinutes: 72, createdAt: twoDaysAgo, startedAt: yesterday, completedAt: null, updatedAt: now, order: 0 },
    { id: generateId(), title: '团队周会', description: '讨论本周进度和下周计划', status: 'pending' as const, priority: 'high' as const, progress: 0, parentId: null, groupId: workGroupId, dueDate: today, dueTime: '14:00', reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: true, recurringRule: JSON.stringify({ type: 'weekly', interval: 1, daysOfWeek: [1] }), isImportant: false, isMigrated: false, estimatedMinutes: 60, actualMinutes: 0, createdAt: yesterday, startedAt: null, completedAt: null, updatedAt: now, order: 1 },
    { id: generateId(), title: '审查代码PR #234', description: '审查前端重构的Pull Request', status: 'pending' as const, priority: 'medium' as const, progress: 0, parentId: null, groupId: workGroupId, dueDate: tomorrow, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 45, actualMinutes: 0, createdAt: yesterday, startedAt: null, completedAt: null, updatedAt: now, order: 2 },
    { id: generateId(), title: '更新用户文档', description: '根据最新功能更新用户使用手册', status: 'completed' as const, priority: 'low' as const, progress: 100, parentId: null, groupId: workGroupId, dueDate: yesterday, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 30, actualMinutes: 25, createdAt: twoDaysAgo, startedAt: twoDaysAgo, completedAt: yesterday, updatedAt: now, order: 3 },
    { id: generateId(), title: '健身 - 跑步5公里', description: '晨跑5公里，保持运动习惯', status: 'completed' as const, priority: 'medium' as const, progress: 100, parentId: null, groupId: personalGroupId, dueDate: today, dueTime: '07:00', reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: true, recurringRule: JSON.stringify({ type: 'daily', interval: 1 }), isImportant: false, isMigrated: false, estimatedMinutes: 40, actualMinutes: 35, createdAt: twoDaysAgo, startedAt: today, completedAt: today, updatedAt: now, order: 4 },
    { id: generateId(), title: '购买生活用品', description: '洗衣液、纸巾、水果', status: 'pending' as const, priority: 'low' as const, progress: 0, parentId: null, groupId: personalGroupId, dueDate: tomorrow, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 30, actualMinutes: 0, createdAt: today, startedAt: null, completedAt: null, updatedAt: now, order: 5 },
    { id: generateId(), title: '阅读《设计模式》第5章', description: '学习策略模式和观察者模式', status: 'in_progress' as const, priority: 'medium' as const, progress: 30, parentId: null, groupId: studyGroupId, dueDate: tomorrow, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: true, isMigrated: false, estimatedMinutes: 90, actualMinutes: 27, createdAt: yesterday, startedAt: today, completedAt: null, updatedAt: now, order: 6 },
    { id: generateId(), title: '完成TypeScript在线课程', description: '完成第8-10节课程内容', status: 'pending' as const, priority: 'medium' as const, progress: 0, parentId: null, groupId: studyGroupId, dueDate: null, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 120, actualMinutes: 0, createdAt: twoDaysAgo, startedAt: null, completedAt: null, updatedAt: now, order: 7 },
    { id: generateId(), title: '提交客户方案', description: '完成并提交给客户审核', status: 'pending' as const, priority: 'urgent' as const, progress: 0, parentId: null, groupId: workGroupId, dueDate: twoDaysAgo, dueTime: '18:00', reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: true, isMigrated: true, estimatedMinutes: 180, actualMinutes: 0, createdAt: twoDaysAgo, startedAt: null, completedAt: null, updatedAt: now, order: 8 },
    { id: generateId(), title: '准备面试题', description: '整理前端面试常见问题', status: 'pending' as const, priority: 'high' as const, progress: 0, parentId: null, groupId: studyGroupId, dueDate: null, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 60, actualMinutes: 0, createdAt: today, startedAt: null, completedAt: null, updatedAt: now, order: 9 },
  ]

  await db.tasks.bulkAdd(tasks)

  const parentTaskId = tasks[0].id
  await db.tasks.bulkAdd([
    { id: generateId(), title: '收集Q2项目数据', description: '从各部门收集项目进度数据', status: 'completed' as const, priority: 'high' as const, progress: 100, parentId: parentTaskId, groupId: null, dueDate: today, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 30, actualMinutes: 25, createdAt: twoDaysAgo, startedAt: twoDaysAgo, completedAt: yesterday, updatedAt: now, order: 0 },
    { id: generateId(), title: '制作PPT演示文稿', description: '根据数据制作汇报PPT', status: 'in_progress' as const, priority: 'high' as const, progress: 40, parentId: parentTaskId, groupId: null, dueDate: today, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 60, actualMinutes: 24, createdAt: yesterday, startedAt: today, completedAt: null, updatedAt: now, order: 1 },
    { id: generateId(), title: '演练演讲', description: '至少演练2遍完整汇报流程', status: 'pending' as const, priority: 'medium' as const, progress: 0, parentId: parentTaskId, groupId: null, dueDate: today, dueTime: null, reminderIds: [], dependencyIds: [], attachmentIds: [], isRecurring: false, recurringRule: null, isImportant: false, isMigrated: false, estimatedMinutes: 30, actualMinutes: 0, createdAt: today, startedAt: null, completedAt: null, updatedAt: now, order: 2 },
  ])

  await db.settings.put({ key: 'seedVersion', value: String(SEED_VERSION) })

  await db.stickyNotes.bulkAdd([
    { id: generateId(), content: '今天下午3点开会讨论新方案', color: 'yellow', tags: ['工作'], isPinned: true, createdAt: now, updatedAt: now, order: 0 },
    { id: generateId(), content: '读《原子习惯》- 习惯叠加法则', color: 'blue', tags: ['读书'], isPinned: false, createdAt: yesterday, updatedAt: yesterday, order: 1 },
    { id: generateId(), content: '周末去公园跑步', color: 'green', tags: ['健康'], isPinned: false, createdAt: twoDaysAgo, updatedAt: twoDaysAgo, order: 2 },
    { id: generateId(), content: '产品灵感：加入语音输入功能，方便快速记录', color: 'pink', tags: ['灵感'], isPinned: true, createdAt: now, updatedAt: now, order: 3 },
    { id: generateId(), content: '给妈妈打电话', color: 'orange', tags: ['生活'], isPinned: false, createdAt: yesterday, updatedAt: yesterday, order: 4 },
  ])

  const kb1Id = generateId()
  const kb2Id = generateId()
  await db.knowledgeBases.bulkAdd([
    { id: kb1Id, name: '前端技术', icon: 'laptop', order: 0, createdAt: now },
    { id: kb2Id, name: '产品设计', icon: 'palette', order: 1, createdAt: now },
  ])

  const f1Id = generateId()
  const f2Id = generateId()
  const f3Id = generateId()
  await db.folders.bulkAdd([
    { id: f1Id, kbId: kb1Id, name: 'React', order: 0, createdAt: now },
    { id: f2Id, kbId: kb1Id, name: 'TypeScript', order: 1, createdAt: now },
    { id: f3Id, kbId: kb2Id, name: '用户研究', order: 0, createdAt: now },
  ])

  const doc1Id = generateId()
  const doc2Id = generateId()
  const doc3Id = generateId()
  const doc4Id = generateId()

  const doc1Content = '<h2>React Hooks 最佳实践</h2><p>1. useState 用于简单状态</p><p>2. useReducer 用于复杂状态逻辑，参考 [[TypeScript 泛型进阶]] 中的类型设计</p><p>3. useEffect 注意依赖数组</p><p>4. useCallback 和 useMemo 用于性能优化，详见 [[React Server Components 入门]]</p>'
  const doc2Content = '<h2>RSC 入门</h2><p>RSC 允许在服务端渲染组件，减少客户端 JavaScript 体积。与 [[React Hooks 最佳实践]] 中的客户端模式互补。</p><h3>核心概念</h3><ul><li>Server Components 默认在服务端渲染</li><li>Client Components 通过 "use client" 标记</li><li>两者可以混合使用</li></ul>'
  const doc3Content = '<h2>TypeScript 泛型进阶</h2><ul><li>泛型约束：extends</li><li>条件类型：T extends U ? X : Y</li><li>映射类型：{ [K in keyof T]: ... }</li><li>模板字面量类型，在 [[React Hooks 最佳实践]] 中有实际应用</li></ul>'
  const doc4Content = '<h2>用户访谈技巧</h2><ol><li>开放式问题</li><li>避免引导性问题</li><li>5个为什么</li><li>关注行为而非观点</li><li>记录具体场景</li></ol>'

  await db.docs.bulkAdd([
    { id: doc1Id, folderId: f1Id, kbId: kb1Id, title: 'React Hooks 最佳实践', content: doc1Content, tags: ['React', 'Hooks'], createdAt: twoDaysAgo, updatedAt: yesterday, order: 0 },
    { id: doc2Id, folderId: f1Id, kbId: kb1Id, title: 'React Server Components 入门', content: doc2Content, tags: ['React', 'RSC'], createdAt: yesterday, updatedAt: yesterday, order: 1 },
    { id: doc3Id, folderId: f2Id, kbId: kb1Id, title: 'TypeScript 泛型进阶', content: doc3Content, tags: ['TypeScript'], createdAt: now, updatedAt: now, order: 0 },
    { id: doc4Id, folderId: f3Id, kbId: kb2Id, title: '用户访谈技巧', content: doc4Content, tags: ['用户研究'], createdAt: now, updatedAt: now, order: 0 },
  ])

  const allDocChunks = [
    ...htmlToChunkRecords(doc1Id, doc1Content),
    ...htmlToChunkRecords(doc2Id, doc2Content),
    ...htmlToChunkRecords(doc3Id, doc3Content),
    ...htmlToChunkRecords(doc4Id, doc4Content),
  ]
  await db.docChunks.bulkAdd(allDocChunks)

  const docTitleToIdMap = new Map<string, string>([
    ['react hooks 最佳实践', doc1Id],
    ['react server components 入门', doc2Id],
    ['typescript 泛型进阶', doc3Id],
    ['用户访谈技巧', doc4Id],
  ])

  const allDocLinks: { id: string; sourceDocId: string; targetDocId: string; type: 'reference' | 'related' | 'depends_on' | 'extends' | 'contradicts'; description: string; createdAt: string }[] = []
  const seenLinks = new Set<string>()

  for (const [docId, chunks] of [
    [doc1Id, htmlToChunkRecords(doc1Id, doc1Content)],
    [doc2Id, htmlToChunkRecords(doc2Id, doc2Content)],
    [doc3Id, htmlToChunkRecords(doc3Id, doc3Content)],
    [doc4Id, htmlToChunkRecords(doc4Id, doc4Content)],
  ] as [string, typeof allDocChunks][]) {
    const links = resolveDocLinks(docId, chunks, docTitleToIdMap)
    for (const link of links) {
      const key = `${link.sourceDocId}->${link.targetDocId}`
      if (!seenLinks.has(key)) {
        seenLinks.add(key)
        allDocLinks.push(link)
      }
    }
  }

  if (allDocLinks.length > 0) {
    await db.docLinks.bulkAdd(allDocLinks)
  }

  const inspCat1Id = generateId()
  const inspCat2Id = generateId()
  const inspCat3Id = generateId()
  await db.inspirationCategories.bulkAdd([
    { id: inspCat1Id, name: '设计灵感', icon: 'palette', color: '#f59e0b', order: 0, createdAt: now },
    { id: inspCat2Id, name: '技术发现', icon: 'laptop', color: '#3b82f6', order: 1, createdAt: now },
    { id: inspCat3Id, name: '生活妙招', icon: 'leaf', color: '#10b981', order: 2, createdAt: now },
  ])

  await db.inspirations.bulkAdd([
    { id: generateId(), title: '极简主义UI设计趋势', content: '2024年极简主义设计回归，更多留白、更少装饰，强调内容本身。黑白配色+一个强调色成为主流。', source: 'wechat', sourceUrl: 'https://mp.weixin.qq.com/s/example1', sourceAuthor: '设计研究所', coverImage: '', categoryId: inspCat1Id, tags: JSON.stringify(['UI', '设计趋势']), status: 'unread', isFavorite: 1, createdAt: now, updatedAt: now, order: 0 },
    { id: generateId(), title: 'React 19 新特性总结', content: 'React 19 引入了 Actions、use() hook、Server Components 稳定版等重大更新，简化了表单处理和数据获取。', source: 'wechat', sourceUrl: 'https://mp.weixin.qq.com/s/example2', sourceAuthor: '前端早读课', coverImage: '', categoryId: inspCat2Id, tags: JSON.stringify(['React', '前端']), status: 'read', isFavorite: 1, createdAt: yesterday, updatedAt: yesterday, order: 1 },
    { id: generateId(), title: '如何用AI提升工作效率', content: '分享5个实用AI工具：1. ChatGPT写邮件 2. Midjourney做配图 3. Copilot写代码 4. Notion AI整理笔记 5. Whisper语音转文字', source: 'douyin', sourceUrl: 'https://v.douyin.com/example3', sourceAuthor: '效率达人小王', coverImage: '', categoryId: inspCat3Id, tags: JSON.stringify(['AI', '效率']), status: 'unread', isFavorite: 0, createdAt: twoDaysAgo, updatedAt: twoDaysAgo, order: 2 },
    { id: generateId(), title: 'CSS容器查询实战', content: '容器查询@media的替代方案，基于父容器而非视口响应，让组件真正实现自适应。@container语法详解。', source: 'wechat', sourceUrl: 'https://mp.weixin.qq.com/s/example4', sourceAuthor: 'CSS魔法师', coverImage: '', categoryId: inspCat2Id, tags: JSON.stringify(['CSS', '响应式']), status: 'archived', isFavorite: 0, createdAt: twoDaysAgo, updatedAt: twoDaysAgo, order: 3 },
    { id: generateId(), title: '手绘风格在产品中的应用', content: '手绘风格让产品更有温度，适合创意类工具和笔记应用。关键：保持一致性、不过度装饰、留白很重要。', source: 'douyin', sourceUrl: 'https://v.douyin.com/example5', sourceAuthor: '产品设计师Lily', coverImage: '', categoryId: inspCat1Id, tags: JSON.stringify(['手绘', '产品设计']), status: 'unread', isFavorite: 1, createdAt: now, updatedAt: now, order: 4 },
  ])

  console.log('[Seed] 测试数据已注入(v' + SEED_VERSION + '):', tasks.length + 3, '个任务, 5个便签, 2个知识库,', allDocChunks.length, '个文档块,', allDocLinks.length, '个文档链接, 5个灵感')
}

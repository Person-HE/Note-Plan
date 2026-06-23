import { addDays, toISODateString } from '@/shared'
import { startOfWeek } from '@/shared/date-utils'
import type { NLPResult, TaskDecomposition, AIConfig, AIChatMessage } from './types'

const AI_CONFIG_KEY = 'note-plan-ai-config'

export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'none',
  apiKey: '',
  apiBaseUrl: '',
  model: '',
  enabled: false,
}

const PROVIDER_DEFAULTS: Record<string, Pick<AIConfig, 'apiBaseUrl' | 'model'>> = {
  openai: { apiBaseUrl: 'https://api.openai.com', model: 'gpt-3.5-turbo' },
  ollama: { apiBaseUrl: 'http://localhost:11434', model: 'llama3' },
  custom: { apiBaseUrl: '', model: '' },
}

export function getProviderDefaults(provider: AIConfig['provider']): Pick<AIConfig, 'apiBaseUrl' | 'model'> {
  return PROVIDER_DEFAULTS[provider] || { apiBaseUrl: '', model: '' }
}

export function getAIConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(AI_CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AIConfig>
      return { ...DEFAULT_AI_CONFIG, ...parsed }
    }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_AI_CONFIG }
}

export function saveAIConfig(config: AIConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const config = getAIConfig()
  if (!config.enabled || config.provider === 'none') {
    throw new Error('AI 未配置或未启用')
  }

  const messages: AIChatMessage[] = []
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt })
  }
  messages.push({ role: 'user', content: prompt })

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '')
  const url = `${baseUrl}/v1/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: config.model,
      messages,
      stream: false,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`AI API 请求失败 (${response.status}): ${errorText || response.statusText}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('AI 返回了空内容')
  }
  return content.trim()
}

export async function testAIConnection(config: AIConfig): Promise<{ ok: boolean; message: string }> {
  if (config.provider === 'none') {
    return { ok: false, message: '请先选择 AI 服务商' }
  }

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '')
  const url = `${baseUrl}/v1/chat/completions`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 5,
        stream: false,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (response.ok) {
      return { ok: true, message: '连接成功！' }
    }
    const errorText = await response.text().catch(() => '')
    return { ok: false, message: `连接失败 (${response.status}): ${errorText || response.statusText}` }
  } catch (err) {
    if ((err as Error).name === 'TimeoutError' || (err as Error).name === 'AbortError') {
      return { ok: false, message: '连接超时，请检查地址是否正确以及服务是否运行' }
    }
    return { ok: false, message: `连接失败: ${(err as Error).message}` }
  }
}

export async function parseNaturalLanguageAI(input: string): Promise<NLPResult> {
  const systemPrompt = `你是一个任务解析助手。用户会输入一段自然语言描述的任务，你需要提取出以下信息并以 JSON 格式返回：
- title: 任务标题（字符串）
- dueDate: 截止日期，格式 YYYY-MM-DD（可选，字符串或null）
- dueTime: 截止时间，格式 HH:MM（可选，字符串或null）
- priority: 优先级，可选值为 low/medium/high/urgent（可选，字符串或null）

只返回 JSON，不要其他内容。今天是 ${toISODateString(new Date())}。`

  const response = await callAI(input, systemPrompt)
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('无法解析 AI 返回的 JSON')
    const parsed = JSON.parse(jsonMatch[0])
    return {
      title: parsed.title || input,
      dueDate: parsed.dueDate || undefined,
      dueTime: parsed.dueTime || undefined,
      priority: parsed.priority || undefined,
    }
  } catch {
    return { title: input }
  }
}

export async function decomposeTaskAI(title: string): Promise<TaskDecomposition> {
  const systemPrompt = `你是一个任务拆解助手。用户会给你一个任务标题，你需要将它拆解为 3-7 个具体的子任务。
以 JSON 格式返回：{ "subtasks": ["子任务1", "子任务2", ...] }
只返回 JSON，不要其他内容。`

  const response = await callAI(`请拆解任务：${title}`, systemPrompt)
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('无法解析 AI 返回的 JSON')
    const parsed = JSON.parse(jsonMatch[0])
    if (Array.isArray(parsed.subtasks) && parsed.subtasks.length > 0) {
      return { parentTitle: title, subtasks: parsed.subtasks }
    }
  } catch {
    // fallback to local
  }
  return decomposeTask(title)
}

export function isAIEnabled(): boolean {
  const config = getAIConfig()
  return config.enabled && config.provider !== 'none' && !!config.apiBaseUrl && !!config.model
}

const PRIORITY_KEYWORDS: Record<string, 'urgent' | 'high' | 'medium' | 'low'> = {
  '紧急': 'urgent',
  '急': 'urgent',
  '加急': 'urgent',
  '重要': 'high',
  '优先': 'high',
  '尽快': 'high',
  '一般': 'medium',
  '普通': 'low',
  '不急': 'low',
}

const TIME_PATTERNS: { pattern: RegExp; hour: number; minute: number }[] = [
  { pattern: /凌晨(\d{1,2})点?/, hour: 0, minute: 0 },
  { pattern: /早上(\d{1,2})点?/, hour: 0, minute: 0 },
  { pattern: /上午(\d{1,2})点?/, hour: 0, minute: 0 },
  { pattern: /中午(\d{1,2})点?/, hour: 12, minute: 0 },
  { pattern: /下午(\d{1,2})点?/, hour: 12, minute: 0 },
  { pattern: /晚上(\d{1,2})点?/, hour: 12, minute: 0 },
  { pattern: /傍晚(\d{1,2})点?/, hour: 12, minute: 0 },
  { pattern: /(\d{1,2})点(\d{1,2})分?/, hour: 0, minute: 0 },
  { pattern: /(\d{1,2}):(\d{2})/, hour: 0, minute: 0 },
  { pattern: /(\d{1,2})点/, hour: 0, minute: 0 },
]

export function parseNaturalLanguage(input: string): NLPResult {
  let text = input.trim()
  const result: NLPResult = { title: '' }

  // Remove # tags from text (no longer stored as task tags)
  text = text.replace(/#[^\s#]+/g, '').trim()

  for (const [keyword, priority] of Object.entries(PRIORITY_KEYWORDS)) {
    if (text.includes(keyword)) {
      result.priority = priority
      text = text.replace(keyword, '').trim()
      break
    }
  }

  const dateResult = parseDateExpression(text)
  if (dateResult.date) {
    result.dueDate = dateResult.date
    text = dateResult.remaining
  }

  const timeResult = parseTimeExpression(text)
  if (timeResult.time) {
    result.dueTime = timeResult.time
    text = timeResult.remaining
  }

  result.title = text.replace(/\s+/g, ' ').trim()

  return result
}

function parseDateExpression(text: string): { date: string | null; remaining: string } {
  const today = new Date()
  const todayStr = toISODateString(today)

  if (/今天/.test(text)) {
    return { date: todayStr, remaining: text.replace(/今天/, '').trim() }
  }
  if (/明天/.test(text)) {
    return { date: toISODateString(addDays(today, 1)), remaining: text.replace(/明天/, '').trim() }
  }
  if (/后天/.test(text)) {
    return { date: toISODateString(addDays(today, 2)), remaining: text.replace(/后天/, '').trim() }
  }
  if (/大后天/.test(text)) {
    return { date: toISODateString(addDays(today, 3)), remaining: text.replace(/大后天/, '').trim() }
  }

  const weekDayMatch = text.match(/下?周([一二三四五六日天])/)
  if (weekDayMatch) {
    const dayMap: Record<string, number> = {
      '一': 1, '二': 2, '三': 3, '四': 4,
      '五': 5, '六': 6, '日': 0, '天': 0,
    }
    const targetDay = dayMap[weekDayMatch[1]]
    const isNext = text.includes('下周')
    const weekStart = startOfWeek(today, { weekStartsOn: 1 })
    let targetDate = addDays(weekStart, targetDay)
    if (isNext) {
      targetDate = addDays(targetDate, 7)
    } else if (targetDate <= today) {
      targetDate = addDays(targetDate, 7)
    }
    return { date: toISODateString(targetDate), remaining: text.replace(/下?周[一二三四五六日天]/, '').trim() }
  }

  const nDaysMatch = text.match(/(\d+)天后/)
  if (nDaysMatch) {
    const n = parseInt(nDaysMatch[1], 10)
    return { date: toISODateString(addDays(today, n)), remaining: text.replace(/\d+天后/, '').trim() }
  }

  const isoDateMatch = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (isoDateMatch) {
    return { date: `${isoDateMatch[1]}-${isoDateMatch[2].padStart(2, '0')}-${isoDateMatch[3].padStart(2, '0')}`, remaining: text.replace(/\d{4}-\d{1,2}-\d{1,2}/, '').trim() }
  }

  const shortDateMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]/)
  if (shortDateMatch) {
    const month = parseInt(shortDateMatch[1], 10)
    const day = parseInt(shortDateMatch[2], 10)
    const year = today.getFullYear()
    let date = new Date(year, month - 1, day)
    if (date < today) {
      date = new Date(year + 1, month - 1, day)
    }
    return { date: toISODateString(date), remaining: text.replace(/\d{1,2}月\d{1,2}[日号]/, '').trim() }
  }

  return { date: null, remaining: text }
}

function parseTimeExpression(text: string): { time: string | null; remaining: string } {
  for (const { pattern } of TIME_PATTERNS) {
    const match = text.match(pattern)
    if (match) {
      let hour: number
      let minute: number = 0

      if (/凌晨/.test(text)) {
        const m = text.match(/凌晨(\d{1,2})点?/)
        hour = parseInt(m![1], 10)
      } else if (/早上|上午/.test(text)) {
        const m = text.match(/(?:早上|上午)(\d{1,2})点?/)
        hour = parseInt(m![1], 10)
      } else if (/中午/.test(text)) {
        const m = text.match(/中午(\d{1,2})点?/)
        hour = parseInt(m![1], 10)
        if (hour < 12) hour += 12
      } else if (/下午|傍晚/.test(text)) {
        const m = text.match(/(?:下午|傍晚)(\d{1,2})点?/)
        hour = parseInt(m![1], 10)
        if (hour < 12) hour += 12
      } else if (/晚上/.test(text)) {
        const m = text.match(/晚上(\d{1,2})点?/)
        hour = parseInt(m![1], 10)
        if (hour < 12) hour += 12
      } else if (/(\d{1,2})点(\d{1,2})分?/.test(text)) {
        const m = text.match(/(\d{1,2})点(\d{1,2})分?/)
        hour = parseInt(m![1], 10)
        minute = parseInt(m![2], 10)
      } else if (/(\d{1,2}):(\d{2})/.test(text)) {
        const m = text.match(/(\d{1,2}):(\d{2})/)
        hour = parseInt(m![1], 10)
        minute = parseInt(m![2], 10)
      } else if (/(\d{1,2})点/.test(text)) {
        const m = text.match(/(\d{1,2})点/)
        hour = parseInt(m![1], 10)
      } else {
        continue
      }

      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const timeRegex = /(?:凌晨|早上|上午|中午|下午|傍晚|晚上)?\d{1,2}点\d{1,2}分?|(?:凌晨|早上|上午|中午|下午|傍晚|晚上)?\d{1,2}点|\d{1,2}:\d{2}/
      return { time: timeStr, remaining: text.replace(timeRegex, '').trim() }
    }
  }

  return { time: null, remaining: text }
}

const DECOMPOSITION_RULES: { pattern: RegExp; subtasks: string[] }[] = [
  {
    pattern: /写|撰写|编写|起草/,
    subtasks: ['确定主题和大纲', '收集相关资料', '撰写初稿', '审阅和修改', '最终定稿'],
  },
  {
    pattern: /开发|实现|构建|搭建/,
    subtasks: ['需求分析', '技术方案设计', '编码实现', '测试验证', '部署上线'],
  },
  {
    pattern: /学习|研究|掌握/,
    subtasks: ['了解基础概念', '阅读核心资料', '动手实践练习', '总结学习笔记', '分享学习成果'],
  },
  {
    pattern: /准备|筹备|策划/,
    subtasks: ['明确目标和范围', '制定计划和时间表', '准备所需资源', '执行准备工作', '最终检查确认'],
  },
  {
    pattern: /设计|规划/,
    subtasks: ['需求调研', '方案构思', '草图/原型设计', '评审和修改', '输出最终方案'],
  },
  {
    pattern: /测试|验证|检查/,
    subtasks: ['制定测试计划', '准备测试环境', '执行测试用例', '记录测试结果', '修复和回归验证'],
  },
  {
    pattern: /发布|上线|部署/,
    subtasks: ['发布前检查', '准备发布说明', '执行发布操作', '线上验证', '监控观察'],
  },
  {
    pattern: /会议|讨论|沟通/,
    subtasks: ['确定会议议题', '准备会议材料', '通知参会人员', '进行会议', '整理会议纪要'],
  },
]

export function decomposeTask(title: string): TaskDecomposition {
  for (const rule of DECOMPOSITION_RULES) {
    if (rule.pattern.test(title)) {
      return { parentTitle: title, subtasks: rule.subtasks }
    }
  }

  return {
    parentTitle: title,
    subtasks: [
      '明确目标和要求',
      '制定执行计划',
      '执行主要步骤',
      '检查和验证',
      '总结和归档',
    ],
  }
}

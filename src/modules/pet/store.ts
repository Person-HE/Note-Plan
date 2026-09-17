import { create } from 'zustand'
import { eventBus } from '@/core'
import { generateId, toISODateTimeString, isElectron } from '@/shared'
import { getAIConfig } from '@/modules/ai/services'
import type { PetMood, PetAction, ChatMessage, AITool, ToolCallResult } from './types'
import { getAllTools } from './tools'

const SYSTEM_PROMPT = `你是Note-Plan的桌宠助手"小笔"，你可以帮助用户管理待办任务、记录灵感、操作知识库、查询统计、管理设置等几乎所有应用功能。

你的核心能力：
1. **任务管理**：创建/更新/删除/完成/取消任务，设置优先级、截止日期、重要性、循环规则，分解子任务，搜索任务，迁移逾期任务
2. **分组和标签**：创建/更新/删除分组和标签，按分组/标签筛选任务
3. **知识库管理**：创建/重命名/删除知识库，管理文件夹，创建/编辑/搜索文档，添加文档链接
4. **灵感与便利贴**：添加灵感/便利贴，收藏/置顶/标记已读/完成，从剪贴板导入，管理灵感分类
5. **提醒管理**：创建单次/递进/强提醒，延后/关闭提醒，查看提醒列表
6. **附件管理**：为任务添加/删除附件，查看附件列表
7. **统计查询**：获取任务统计摘要、今日摘要、周报，导出报告
8. **设置管理**：查看/修改主题、语言、默认视图、每日目标、免打扰、快捷键、开机自启等设置
9. **安全设置**：隐私模式、仅本地存储、数据加密、密码、锁定应用
10. **视图控制**：切换视图模式、日历视图、侧边栏标签页、选择日期

重要规则：
- 当用户用自然语言描述任务时（如"明天下午3点开会"），优先使用 task.create_natural 工具
- 当用户需要查找某个任务但不知道ID时，先用 task.search 或 task.list 搜索
- 当用户想了解应用能做什么时，使用 help 工具
- 对于无法通过工具实现的请求（如联网搜索、发送邮件等），直接告诉用户该功能无法实现
- 请用简洁友好的中文回复，执行操作后简要说明结果`

const MOOD_ACTION_MAP: Record<PetMood, PetAction> = {
  happy: 'idle',
  thinking: 'think',
  sleeping: 'sleep',
  excited: 'dance',
  sad: 'idle',
  curious: 'point',
  working: 'type',
}

interface PetStoreState {
  mood: PetMood
  action: PetAction
  position: { x: number; y: number }
  isChatOpen: boolean
  messages: ChatMessage[]
  isThinking: boolean

  setMood: (mood: PetMood) => void
  setAction: (action: PetAction) => void
  toggleChat: () => void
  sendMessage: (content: string) => Promise<void>
  updatePosition: (pos: { x: number; y: number }) => void
  reactToEvent: (event: string) => void
}

function buildToolsSchema(tools: AITool[]) {
  return tools.map(tool => {
    const properties: Record<string, any> = {}
    for (const [key, param] of Object.entries(tool.parameters)) {
      properties[key] = {
        type: param.type,
        description: param.description,
      }
    }
    return {
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: {
          type: 'object' as const,
          properties,
          required: Object.entries(tool.parameters)
            .filter(([, v]) => v.required)
            .map(([k]) => k),
        },
      },
    }
  })
}

export const usePetStore = create<PetStoreState>((set, get) => ({
  mood: 'happy',
  action: 'idle',
  position: { x: 0, y: 0 },
  isChatOpen: false,
  messages: [],
  isThinking: false,

  setMood: (mood) => {
    set({ mood, action: MOOD_ACTION_MAP[mood] })
  },

  setAction: (action) => {
    set({ action })
  },

  toggleChat: () => {
    set(state => ({ isChatOpen: !state.isChatOpen }))
  },

  sendMessage: async (content) => {
    const { messages } = get()
    const tools = getAllTools()
    const aiConfig = getAIConfig()

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: toISODateTimeString(new Date()),
    }

    set(state => ({
      messages: [...state.messages, userMessage],
      isThinking: true,
      mood: 'thinking',
    }))

    // 校验统一 AI 配置
    if (!aiConfig.enabled || aiConfig.provider === 'none' || !aiConfig.apiBaseUrl || !aiConfig.model) {
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: '小笔尚未连接 AI 服务，请先到「设置 → AI 助手」中配置并启用 AI。',
        timestamp: toISODateTimeString(new Date()),
      }
      set(state => ({
        messages: [...state.messages, assistantMessage],
        isThinking: false,
        mood: 'sad',
      }))
      return
    }

    const configForIPC = {
      apiBaseUrl: aiConfig.apiBaseUrl,
      apiKey: aiConfig.apiKey,
      model: aiConfig.model,
    }

    try {
      const apiMessages = [
        { role: 'system' as const, content: SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant' | 'system', content: m.content })),
        { role: 'user' as const, content },
      ]

      const toolsSchema = buildToolsSchema(tools)

      // 通过主进程代理调用 AI（规避 CORS），从 raw 中拿到完整 message（含 tool_calls）
      const callLLM = async (msgs: any[], withTools: boolean) => {
        if (isElectron() && window.electronAPI?.callAI) {
          const result = await window.electronAPI.callAI(configForIPC, {
            messages: msgs,
            ...(withTools ? { tools: toolsSchema } : {}),
          })
          if (!result.success) {
            throw new Error(result.error || 'AI 请求失败')
          }
          const choice = (result.data!.raw as any)?.choices?.[0]
          if (!choice || !choice.message) {
            throw new Error('AI 返回数据格式异常')
          }
          return choice.message
        }

        // Web 端回退（受 CORS 限制）
        const baseUrl = aiConfig.apiBaseUrl.replace(/\/+$/, '')
        const chatUrl = /\/v1$/i.test(baseUrl) ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`
        const response = await fetch(chatUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(aiConfig.apiKey ? { 'Authorization': `Bearer ${aiConfig.apiKey}` } : {}),
          },
          body: JSON.stringify({
            model: aiConfig.model,
            messages: msgs,
            ...(withTools ? { tools: toolsSchema } : {}),
            stream: false,
          }),
        })
        if (!response.ok) {
          throw new Error(`AI 请求失败：${response.status} ${response.statusText}`)
        }
        const data = await response.json()
        const choice = data.choices?.[0]
        if (!choice) throw new Error('AI 返回数据格式异常')
        return choice.message
      }

      const assistantMsg = await callLLM(apiMessages, true)

      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        const toolResults: ToolCallResult[] = []

        apiMessages.push({
          role: 'assistant',
          content: assistantMsg.content || '',
          tool_calls: assistantMsg.tool_calls,
        } as any)

        for (const toolCall of assistantMsg.tool_calls) {
          const toolName = toolCall.function.name
          const toolArgs = JSON.parse(toolCall.function.arguments || '{}')
          const tool = tools.find(t => t.name === toolName)

          let result: string
          if (tool) {
            result = await tool.execute(toolArgs)
          } else {
            result = `未知工具：${toolName}`
          }

          toolResults.push({
            tool: toolName,
            args: toolArgs,
            result,
          })

          apiMessages.push({
            role: 'tool' as any,
            content: result,
            tool_call_id: toolCall.id,
          } as any)
        }

        const followUpMsg = await callLLM(apiMessages, true)
        const finalContent = followUpMsg?.content || '工具执行完成，但未获得回复。'

        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: finalContent,
          timestamp: toISODateTimeString(new Date()),
          toolCalls: toolResults,
        }

        set(state => ({
          messages: [...state.messages, assistantMessage],
          isThinking: false,
          mood: 'happy',
          action: 'celebrate',
        }))
      } else {
        const assistantMessage: ChatMessage = {
          id: generateId(),
          role: 'assistant',
          content: assistantMsg.content || '抱歉，我无法理解你的问题。',
          timestamp: toISODateTimeString(new Date()),
        }

        set(state => ({
          messages: [...state.messages, assistantMessage],
          isThinking: false,
          mood: 'happy',
        }))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: `连接失败：${errorMessage}\n\n请到「设置 → AI 助手」检查：\n1. AI 是否已启用\n2. 服务商/API Base URL/模型 是否正确\n3. 测试连接是否通过`,
        timestamp: toISODateTimeString(new Date()),
      }

      set(state => ({
        messages: [...state.messages, assistantMessage],
        isThinking: false,
        mood: 'sad',
      }))
    }
  },

  updatePosition: (pos) => {
    set({ position: pos })
  },

  reactToEvent: (event) => {
    const moodMap: Record<string, PetMood> = {
      'task:completed': 'excited',
      'task:created': 'happy',
      'task:deleted': 'sad',
      'task:updated': 'curious',
      'reminder:triggered': 'excited',
      'achievement:unlocked': 'excited',
      'settings:changed': 'curious',
    }
    const newMood = moodMap[event]
    if (newMood) {
      set({ mood: newMood, action: MOOD_ACTION_MAP[newMood] })
      setTimeout(() => {
        set({ mood: 'happy', action: 'idle' })
      }, 5000)
    }
  },
}))

eventBus.on('task:completed', () => usePetStore.getState().reactToEvent('task:completed'))
eventBus.on('task:created', () => usePetStore.getState().reactToEvent('task:created'))
eventBus.on('task:deleted', () => usePetStore.getState().reactToEvent('task:deleted'))
eventBus.on('task:updated', () => usePetStore.getState().reactToEvent('task:updated'))
eventBus.on('reminder:triggered', () => usePetStore.getState().reactToEvent('reminder:triggered'))
eventBus.on('achievement:unlocked', () => usePetStore.getState().reactToEvent('achievement:unlocked'))
eventBus.on('settings:changed', () => usePetStore.getState().reactToEvent('settings:changed'))

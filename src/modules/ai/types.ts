export interface NLPResult {
  title: string
  dueDate?: string
  dueTime?: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface TaskDecomposition {
  parentTitle: string
  subtasks: string[]
}

export interface AIConfig {
  provider: 'openai' | 'ollama' | 'custom' | 'none'
  apiKey: string
  apiBaseUrl: string
  model: string
  enabled: boolean
}

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type AIConnectionStatus = 'connected' | 'error' | 'unconfigured'

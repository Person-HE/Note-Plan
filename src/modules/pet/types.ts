export type PetMood = 'happy' | 'thinking' | 'sleeping' | 'excited' | 'sad' | 'curious' | 'working'
export type PetAction = 'idle' | 'wave' | 'think' | 'sleep' | 'jump' | 'dance' | 'type' | 'point' | 'celebrate'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  toolCalls?: ToolCallResult[]
}

export interface ToolCallResult {
  tool: string
  args: Record<string, any>
  result: string
}

export interface AITool {
  name: string
  description: string
  parameters: Record<string, { type: string; description: string; required?: boolean }>
  execute: (args: Record<string, any>) => Promise<string>
}

export interface PetState {
  mood: PetMood
  action: PetAction
  position: { x: number; y: number }
  isChatOpen: boolean
  messages: ChatMessage[]
  isThinking: boolean
}

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Icon } from '@/shared/Icons'
import { usePetStore } from './store'
import type { PetMood, ChatMessage, ToolCallResult } from './types'

const IDLE_PHRASES = [
  '有什么我可以帮忙的吗？',
  '今天还有什么待办吗？',
  '要不要休息一下？',
  '需要我帮你整理任务吗？',
]

const petStyles = document.createElement('style')
petStyles.textContent = `
@keyframes pet-idle-breathe {
  0%, 100% { transform: scaleY(1) scaleX(1); }
  50% { transform: scaleY(1.03) scaleX(0.98); }
}
@keyframes pet-idle-sway {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(2deg); }
  75% { transform: rotate(-2deg); }
}
@keyframes pet-happy-bounce {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
  60% { transform: translateY(-6px); }
}
@keyframes pet-thinking-sway {
  0%, 100% { transform: rotate(0deg); }
  30% { transform: rotate(5deg); }
  70% { transform: rotate(-5deg); }
}
@keyframes pet-sleeping-breathe {
  0%, 100% { transform: scaleY(1) scaleX(1); opacity: 1; }
  50% { transform: scaleY(0.95) scaleX(1.04); opacity: 0.85; }
}
@keyframes pet-excited-jump {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-10px) scale(1.05); }
  50% { transform: translateY(-12px) scale(1.08); }
  70% { transform: translateY(-6px) scale(1.02); }
}
@keyframes pet-sad-droop {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(3px) rotate(-3deg); }
}
@keyframes pet-curious-lean {
  0%, 100% { transform: rotate(0deg) translateX(0); }
  50% { transform: rotate(8deg) translateX(3px); }
}
@keyframes pet-working-flex {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes pet-zzz {
  0% { opacity: 0; transform: translate(0, 0) scale(0.5); }
  50% { opacity: 1; transform: translate(6px, -12px) scale(1); }
  100% { opacity: 0; transform: translate(12px, -24px) scale(0.5); }
}
@keyframes speech-fade {
  0% { opacity: 0; transform: translateY(4px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes thinking-dots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}
@keyframes pet-appear {
  0% { opacity: 0; transform: scale(0.3); }
  60% { transform: scale(1.1); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes pet-hover-glow {
  0%, 100% { filter: drop-shadow(0 0 4px rgba(255,140,66,0.3)); }
  50% { filter: drop-shadow(0 0 10px rgba(255,140,66,0.6)); }
}
@keyframes blink {
  0%, 42%, 44%, 100% { transform: scaleY(1); }
  43% { transform: scaleY(0.1); }
}
`
document.head.appendChild(petStyles)

function getMoodAnimation(mood: PetMood): string {
  const map: Record<PetMood, string> = {
    happy: 'pet-happy-bounce 1.5s ease-in-out infinite',
    thinking: 'pet-thinking-sway 2.5s ease-in-out infinite',
    sleeping: 'pet-sleeping-breathe 3s ease-in-out infinite',
    excited: 'pet-excited-jump 0.7s ease-in-out infinite',
    sad: 'pet-sad-droop 3s ease-in-out infinite',
    curious: 'pet-curious-lean 2s ease-in-out infinite',
    working: 'pet-working-flex 1.5s ease-in-out infinite',
  }
  return map[mood]
}

function PetCharacter({ mood }: { mood: PetMood }) {
  const eyeY = 38
  const leftEyeX = 32
  const rightEyeX = 52
  const mouthY = 52

  const renderEyes = () => {
    if (mood === 'sleeping') {
      return (
        <>
          <path d={`M${leftEyeX - 5},${eyeY} Q${leftEyeX},${eyeY - 4} ${leftEyeX + 5},${eyeY}`} fill="none" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" />
          <path d={`M${rightEyeX - 5},${eyeY} Q${rightEyeX},${eyeY - 4} ${rightEyeX + 5},${eyeY}`} fill="none" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" />
        </>
      )
    }
    if (mood === 'sad') {
      return (
        <>
          <ellipse cx={leftEyeX} cy={eyeY} rx={3.5} ry={4} fill="#2c2c2c" />
          <ellipse cx={rightEyeX} cy={eyeY} rx={3.5} ry={4} fill="#2c2c2c" />
          <path d={`M${leftEyeX - 5},${eyeY - 8} Q${leftEyeX},${eyeY - 5} ${leftEyeX + 5},${eyeY - 9}`} fill="none" stroke="#2c2c2c" strokeWidth="1.5" strokeLinecap="round" />
          <path d={`M${rightEyeX - 5},${eyeY - 9} Q${rightEyeX},${eyeY - 5} ${rightEyeX + 5},${eyeY - 8}`} fill="none" stroke="#2c2c2c" strokeWidth="1.5" strokeLinecap="round" />
        </>
      )
    }
    if (mood === 'excited') {
      return (
        <>
          <path d={`M${leftEyeX - 5},${eyeY - 2} L${leftEyeX},${eyeY - 7} L${leftEyeX + 5},${eyeY - 2}`} fill="none" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d={`M${rightEyeX - 5},${eyeY - 2} L${rightEyeX},${eyeY - 7} L${rightEyeX + 5},${eyeY - 2}`} fill="none" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )
    }
    if (mood === 'thinking') {
      return (
        <>
          <ellipse cx={leftEyeX} cy={eyeY} rx={3.5} ry={4} fill="#2c2c2c" />
          <ellipse cx={rightEyeX} cy={eyeY} rx={3.5} ry={4} fill="#2c2c2c" />
          <ellipse cx={leftEyeX + 1} cy={eyeY - 1} rx={1.2} ry={1.5} fill="white" />
          <ellipse cx={rightEyeX + 1} cy={eyeY - 1} rx={1.2} ry={1.5} fill="white" />
        </>
      )
    }
    return (
      <>
        <g style={{ animation: 'blink 4s ease-in-out infinite', transformOrigin: `${leftEyeX}px ${eyeY}px` }}>
          <ellipse cx={leftEyeX} cy={eyeY} rx={3.5} ry={4} fill="#2c2c2c" />
        </g>
        <g style={{ animation: 'blink 4s ease-in-out infinite', transformOrigin: `${rightEyeX}px ${eyeY}px` }}>
          <ellipse cx={rightEyeX} cy={eyeY} rx={3.5} ry={4} fill="#2c2c2c" />
        </g>
        <ellipse cx={leftEyeX + 1} cy={eyeY - 1.5} rx={1.2} ry={1.5} fill="white" />
        <ellipse cx={rightEyeX + 1} cy={eyeY - 1.5} rx={1.2} ry={1.5} fill="white" />
      </>
    )
  }

  const renderMouth = () => {
    if (mood === 'happy' || mood === 'excited') {
      return <path d={`M${36},${mouthY} Q${42},${mouthY + 8} ${48},${mouthY}`} fill="none" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" />
    }
    if (mood === 'sad') {
      return <path d={`M${36},${mouthY + 4} Q${42},${mouthY - 2} ${48},${mouthY + 4}`} fill="none" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" />
    }
    if (mood === 'thinking') {
      return <ellipse cx={42} cy={mouthY + 1} rx={2.5} ry={3} fill="#2c2c2c" />
    }
    if (mood === 'sleeping') {
      return <path d={`M${39},${mouthY} Q${42},${mouthY + 3} ${45},${mouthY}`} fill="none" stroke="#2c2c2c" strokeWidth="1.5" strokeLinecap="round" />
    }
    if (mood === 'curious') {
      return <ellipse cx={42} cy={mouthY + 1} rx={3} ry={2.5} fill="none" stroke="#2c2c2c" strokeWidth="1.5" />
    }
    return <path d={`M${38},${mouthY + 1} Q${42},${mouthY + 4} ${46},${mouthY + 1}`} fill="none" stroke="#2c2c2c" strokeWidth="1.5" strokeLinecap="round" />
  }

  const renderBlush = () => {
    if (mood === 'happy' || mood === 'excited') {
      return (
        <>
          <ellipse cx={24} cy={46} rx={5} ry={3} fill="rgba(255,140,66,0.25)" />
          <ellipse cx={60} cy={46} rx={5} ry={3} fill="rgba(255,140,66,0.25)" />
        </>
      )
    }
    return null
  }

  return (
    <svg width="84" height="100" viewBox="0 0 84 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path d="M42 8 L48 22 L36 22 Z" fill="#FFD93D" stroke="#2c2c2c" strokeWidth="2" strokeLinejoin="round" />
        <rect x="39" y="22" width="6" height="6" fill="#F5C842" stroke="#2c2c2c" strokeWidth="1.5" />
        <path d="M42 2 L44 8 L40 8 Z" fill="#FF8C42" stroke="#2c2c2c" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="28" y="28" width="28" height="44" rx="14" fill="#FDFBF7" stroke="#2c2c2c" strokeWidth="2.5" />
        <rect x="28" y="62" width="28" height="10" rx="0" fill="#FFD93D" stroke="#2c2c2c" strokeWidth="2.5" />
        <path d="M28 62 L56 62" stroke="#2c2c2c" strokeWidth="1.5" strokeDasharray="3 2" />
        <path d="M28 72 L56 72" stroke="#2c2c2c" strokeWidth="2.5" />
        <rect x="28" y="72" width="28" height="8" rx="0" fill="#E8C834" stroke="#2c2c2c" strokeWidth="2.5" />
        <path d="M32 80 Q42 88 52 80" fill="#F5C842" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" />
        {renderEyes()}
        {renderMouth()}
        {renderBlush()}
        {mood === 'thinking' && (
          <text x={62} y={32} fontSize="11" fontFamily="var(--font-hand), cursive" fill="#2c2c2c">?</text>
        )}
        {mood === 'sleeping' && (
          <g style={{ animation: 'pet-zzz 2s ease-in-out infinite' }}>
            <text x={58} y={24} fontSize="10" fontFamily="var(--font-hand), cursive" fill="var(--ink-light, #a0a0a0)">z</text>
          </g>
        )}
        {mood === 'sleeping' && (
          <g style={{ animation: 'pet-zzz 2s ease-in-out infinite 0.5s' }}>
            <text x={64} y={16} fontSize="13" fontFamily="var(--font-hand), cursive" fill="var(--ink-light, #a0a0a0)">Z</text>
          </g>
        )}
        <path d="M20 48 Q14 44 16 38 Q18 34 22 36" fill="#FDFBF7" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" />
        <path d="M64 48 Q70 44 68 38 Q66 34 62 36" fill="#FDFBF7" stroke="#2c2c2c" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export function DesktopPet() {
  const store = usePetStore()
  const mood = usePetStore(s => s.mood)
  const action = usePetStore(s => s.action)
  const position = usePetStore(s => s.position)
  const isChatOpen = usePetStore(s => s.isChatOpen)
  const messages = usePetStore(s => s.messages)
  const isThinking = usePetStore(s => s.isThinking)
  const [mounted, setMounted] = useState(false)
  const [isLongPress, setIsLongPress] = useState(false)

  const [isDragging, setIsDragging] = useState(false)
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 })
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [idlePhrase, setIdlePhrase] = useState(IDLE_PHRASES[0])
  const [showSpeech, setShowSpeech] = useState(false)
  const petRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setMounted(true)
    store.updatePosition({
      x: window.innerWidth - 110,
      y: window.innerHeight - 150,
    })
    setShowSpeech(true)
    const timer = setTimeout(() => setShowSpeech(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * IDLE_PHRASES.length)
      setIdlePhrase(IDLE_PHRASES[idx])
      setShowSpeech(true)
      setTimeout(() => setShowSpeech(false), 5000)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      setShowSpeech(true)
      const timer = setTimeout(() => setShowSpeech(false), 8000)
      return () => clearTimeout(timer)
    }
  }, [messages])

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(false)
    setDragStartPos({ x: e.clientX, y: e.clientY })
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    })
    longPressTimer.current = setTimeout(() => { setIsLongPress(true) }, 300)
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [position])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isLongPress) return
    const newX = Math.max(0, Math.min(window.innerWidth - 84, e.clientX - dragOffset.x))
    const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
    store.updatePosition({ x: newX, y: newY })
  }, [isLongPress, dragOffset, store])

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
    setIsLongPress(false)
    setIsDragging(false)
  }, [])

  const handleClick = useCallback(() => {
    store.toggleChat()
  }, [store])

  const moodAnimation = getMoodAnimation(mood)
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
  const speechText = isThinking ? '正在思考...' : lastAssistantMsg?.content?.slice(0, 50) ?? idlePhrase

  if (!mounted) return null

  return createPortal(
    <>
      <div
        ref={petRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onClick={handleClick}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: 84,
          height: 100,
          zIndex: 9999,
          cursor: isLongPress ? 'grabbing' : 'pointer',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            width: 84,
            height: 100,
            animation: isLongPress
              ? 'pet-hover-glow 1.5s ease-in-out infinite, pet-appear 0.6s ease-out'
              : `${moodAnimation}, pet-appear 0.6s ease-out`,
            transformOrigin: 'center bottom',
            transition: 'animation 0.3s ease',
          }}
        >
          <PetCharacter mood={mood} />
        </div>

        {showSpeech && !isChatOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginBottom: 8,
              width: 'max-content',
              maxWidth: 220,
              padding: '8px 14px',
              fontSize: 14,
              fontFamily: 'var(--font-hand)',
              color: 'var(--ink-black)',
              background: 'var(--paper-bg)',
              border: '2px solid var(--accent-orange)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              animation: 'speech-fade 0.3s ease-out',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'center',
              lineHeight: 1.4,
            }}
          >
            {speechText}
            <div
              style={{
                position: 'absolute',
                bottom: -6,
                left: '50%',
                transform: 'translateX(-50%) rotate(45deg)',
                width: 10,
                height: 10,
                background: 'var(--paper-bg)',
                borderRight: '2px solid var(--accent-orange)',
                borderBottom: '2px solid var(--accent-orange)',
              }}
            />
          </div>
        )}
      </div>

      {isChatOpen && <ChatPanel />}
    </>,
    document.body
  )
}

function ChatPanel() {
  const store = usePetStore()
  const messages = usePetStore(s => s.messages)
  const isThinking = usePetStore(s => s.isThinking)
  const position = usePetStore(s => s.position)
  const mood = usePetStore(s => s.mood)

  const [input, setInput] = useState('')
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isThinking])

  const handleSend = () => {
    if (!input.trim() || isThinking) return
    store.sendMessage(input.trim())
    setInput('')
  }

  const panelX = Math.max(8, Math.min(position.x - 280, window.innerWidth - 380))
  const panelY = Math.max(8, Math.min(position.y - 200, window.innerHeight - 520))

  const toggleToolExpand = (id: string) => {
    setExpandedTools(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: panelX,
        top: panelY,
        width: 360,
        maxHeight: 500,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper-bg)',
        border: 'var(--border-sketch)',
        borderRadius: 'var(--border-radius-lg)',
        boxShadow: 'var(--shadow-sketch-lg)',
        overflow: 'hidden',
        animation: 'speech-fade 0.2s ease-out',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '2px solid var(--ink-black)',
          background: 'var(--accent-orange)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, animation: getMoodAnimation(mood), transformOrigin: 'center bottom' }}>
            <PetCharacter mood={mood} />
          </div>
          <span style={{ fontFamily: 'var(--font-hand)', fontSize: 16, fontWeight: 700, color: 'white' }}>
            小笔
          </span>
        </div>
        <button
          onClick={() => store.toggleChat()}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Icon name="close" size={16} />
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          maxHeight: 360,
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '24px 12px',
              fontFamily: 'var(--font-hand)',
              color: 'var(--ink-light)',
              fontSize: 14,
            }}
          >
            你好！我是小笔，你的桌宠助手～
            <br />
            有什么我可以帮你的吗？
          </div>
        )}

        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            expandedTools={expandedTools}
            onToggleTool={toggleToolExpand}
          />
        ))}

        {isThinking && (
          <div
            style={{
              alignSelf: 'flex-start',
              padding: '8px 12px',
              fontFamily: 'var(--font-hand)',
              fontSize: 14,
              color: 'var(--ink-gray)',
              background: 'var(--paper-texture)',
              border: '2px solid var(--ink-black)',
              borderRadius: 'var(--border-radius-md)',
            }}
          >
            正在思考<span style={{ animation: 'thinking-dots 1.5s steps(1) infinite' }}>...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div
        style={{
          display: 'flex',
          gap: 8,
          padding: 8,
          borderTop: '2px solid var(--ink-black)',
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="输入消息..."
          disabled={isThinking}
          className="input-hand font-hand"
          style={{
            flex: 1,
            fontSize: 14,
            padding: '6px 10px',
            minHeight: 32,
          }}
        />
        <button
          onClick={handleSend}
          disabled={isThinking || !input.trim()}
          className="btn-hand btn-hand-primary"
          style={{
            padding: '6px 10px',
            minHeight: 32,
            fontSize: 14,
          }}
        >
          <Icon name="send" size={14} />
        </button>
      </div>
    </div>
  )
}

function MessageBubble({
  message,
  expandedTools,
  onToggleTool,
}: {
  message: ChatMessage
  expandedTools: Set<string>
  onToggleTool: (id: string) => void
}) {
  const isUser = message.role === 'user'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isUser ? 'flex-end' : 'flex-start',
      }}
    >
      <div
        style={{
          maxWidth: '85%',
          padding: '8px 12px',
          fontFamily: 'var(--font-hand)',
          fontSize: 14,
          lineHeight: 1.6,
          color: isUser ? 'white' : 'var(--ink-black)',
          background: isUser ? 'var(--accent-orange)' : 'var(--paper-bg)',
          border: isUser ? 'none' : '2px solid var(--ink-black)',
          borderRadius: 'var(--border-radius-md)',
          boxShadow: isUser ? 'none' : 'var(--shadow-sketch-sm)',
          wordBreak: 'break-word',
        }}
      >
        {message.content}
      </div>

      {message.toolCalls && message.toolCalls.length > 0 && (
        <div style={{ marginTop: 4, width: '85%', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {message.toolCalls.map((tc, idx) => {
            const toolId = `${message.id}-tool-${idx}`
            const isExpanded = expandedTools.has(toolId)
            return (
              <div
                key={toolId}
                className="tag-hand"
                style={{
                  fontSize: 12,
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  background: 'var(--watercolor-yellow)',
                }}
                onClick={() => onToggleTool(toolId)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon name="settings" size={10} />
                  <span style={{ fontWeight: 600 }}>{tc.tool}</span>
                  {isExpanded ? <Icon name="plus" size={10} /> : <Icon name="minus" size={10} />}
                </div>
                {isExpanded && (
                  <div
                    style={{
                      padding: '4px 0',
                      fontSize: 11,
                      color: 'var(--ink-gray)',
                      borderTop: '1px dashed var(--ink-light)',
                      marginTop: 2,
                    }}
                  >
                    <div>参数：{JSON.stringify(tc.args)}</div>
                    <div style={{ marginTop: 2 }}>结果：{tc.result.slice(0, 200)}{tc.result.length > 200 ? '...' : ''}</div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

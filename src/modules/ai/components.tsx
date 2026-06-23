import React, { useState, useCallback, useEffect } from 'react'
import { Icon } from '@/shared/Icons'
import { cn } from '@/shared'
import { Button, Input, Badge, Select, Checkbox, Spinner } from '@/shared/components'
import {
  parseNaturalLanguage, decomposeTask,
  getAIConfig, saveAIConfig, testAIConnection, getProviderDefaults,
  parseNaturalLanguageAI, decomposeTaskAI, isAIEnabled,
} from './services'
import type { NLPResult, TaskDecomposition, AIConfig, AIConnectionStatus } from './types'

export function NLPInput({
  onSubmit,
}: {
  onSubmit: (result: NLPResult) => void
}) {
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<NLPResult | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = useCallback((value: string) => {
    setInput(value)
    if (!isAIEnabled() && value.trim()) {
      setPreview(parseNaturalLanguage(value))
    } else if (!value.trim()) {
      setPreview(null)
    }
  }, [])

  const handleAIParse = useCallback(async (value: string) => {
    if (!value.trim()) return
    setLoading(true)
    try {
      const result = await parseNaturalLanguageAI(value)
      setPreview(result)
    } catch {
      setPreview(parseNaturalLanguage(value))
    } finally {
      setLoading(false)
    }
  }, [])

  const handleSubmit = () => {
    if (!input.trim() || !preview) return
    onSubmit(preview)
    setInput('')
    setPreview(null)
  }

  const aiOn = isAIEnabled()

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <Icon name="sparkle" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
          <input
            value={input}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (aiOn) handleAIParse(input)
                else handleSubmit()
              }
            }}
            placeholder="输入自然语言，如：明天下午3点开会..."
            className={cn(
              'w-full pl-9 pr-3 py-2 rounded-lg border border-surface-300 bg-white text-sm',
              'dark:border-surface-600 dark:bg-surface-800 dark:text-surface-100',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'placeholder-surface-400 dark:placeholder-surface-500'
            )}
          />
        </div>
        <Button size="sm" onClick={() => aiOn ? handleAIParse(input) : handleSubmit()} disabled={!input.trim() || loading}>
          {loading ? <Spinner size={14} /> : <Icon name="sparkle" size={14} />}
          {aiOn ? 'AI解析' : '解析'}
        </Button>
      </div>

      {preview && (
        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-1.5 mb-2">
            <Icon name="brain" size={14} className="text-primary-600 dark:text-primary-400" />
            <span className="text-xs font-medium text-primary-700 dark:text-primary-300">解析预览</span>
          </div>
          <div className="space-y-1.5">
            <div className="text-sm font-medium text-surface-900 dark:text-surface-100">
              {preview.title || <span className="text-surface-400 italic">未识别到标题</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {preview.dueDate && (
                <Badge variant="info" size="sm">
                  <Icon name="calendar" size={10} className="mr-1" />
                  {preview.dueDate}
                </Badge>
              )}
              {preview.dueTime && (
                <Badge variant="info" size="sm">
                  <Icon name="clock" size={10} className="mr-1" />
                  {preview.dueTime}
                </Badge>
              )}
              {preview.priority && (
                <Badge
                  variant={preview.priority === 'urgent' ? 'danger' : preview.priority === 'high' ? 'warning' : 'default'}
                  size="sm"
                >
                  <Icon name="flag" size={10} className="mr-1" />
                  {preview.priority}
                </Badge>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ConnectionIndicator({ status }: { status: AIConnectionStatus }) {
  const colors: Record<AIConnectionStatus, string> = {
    connected: 'var(--accent-green, #22c55e)',
    error: 'var(--accent-red, #ef4444)',
    unconfigured: 'var(--ink-light)',
  }
  const labels: Record<AIConnectionStatus, string> = {
    connected: '已连接',
    error: '连接异常',
    unconfigured: '未配置',
  }
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: colors[status], border: '1px solid var(--ink-black)' }}
      />
      <span className="text-xs font-hand" style={{ color: colors[status] }}>{labels[status]}</span>
    </div>
  )
}

export function AIConfigSection() {
  const [config, setConfig] = useState<AIConfig>(getAIConfig)
  const [connectionStatus, setConnectionStatus] = useState<AIConnectionStatus>('unconfigured')
  const [testing, setTesting] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)

  useEffect(() => {
    const saved = getAIConfig()
    setConfig(saved)
    if (saved.enabled && saved.provider !== 'none' && saved.apiBaseUrl && saved.model) {
      setConnectionStatus('connected')
    } else {
      setConnectionStatus('unconfigured')
    }
  }, [])

  const updateConfig = (partial: Partial<AIConfig>) => {
    const next = { ...config, ...partial }
    setConfig(next)
    saveAIConfig(next)
  }

  const handleProviderChange = (provider: string) => {
    const p = provider as AIConfig['provider']
    const defaults = getProviderDefaults(p)
    const next: AIConfig = {
      ...config,
      provider: p,
      apiBaseUrl: defaults.apiBaseUrl || config.apiBaseUrl,
      model: defaults.model || config.model,
    }
    if (p === 'ollama') {
      next.apiKey = ''
    }
    setConfig(next)
    saveAIConfig(next)
    setConnectionStatus('unconfigured')
    setTestMessage('')
  }

  const handleTest = async () => {
    setTesting(true)
    setTestMessage('')
    try {
      const result = await testAIConnection(config)
      setConnectionStatus(result.ok ? 'connected' : 'error')
      setTestMessage(result.message)
    } catch {
      setConnectionStatus('error')
      setTestMessage('测试失败')
    } finally {
      setTesting(false)
    }
  }

  const showKeyField = config.provider === 'openai' || config.provider === 'custom'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon name="settings" size={14} style={{ color: 'var(--ink-gray)' }} />
          <span className="text-sm font-semibold font-hand" style={{ color: 'var(--ink-gray)' }}>API 配置</span>
        </div>
        <ConnectionIndicator status={connectionStatus} />
      </div>

      <div className="space-y-2.5 pl-1">
        <div className="flex items-center justify-between">
          <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>服务商</span>
          <div className="w-40">
            <Select
              value={config.provider}
              onChange={handleProviderChange}
              options={[
                { label: '未选择', value: 'none' },
                { label: 'OpenAI', value: 'openai' },
                { label: 'Ollama (本地)', value: 'ollama' },
                { label: '自定义', value: 'custom' },
              ]}
            />
          </div>
        </div>

        {config.provider !== 'none' && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Icon name="database" size={12} style={{ color: 'var(--ink-light)' }} />
                <span className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>API Base URL</span>
              </div>
              <Input
                value={config.apiBaseUrl}
                onChange={(e) => updateConfig({ apiBaseUrl: e.target.value })}
                placeholder={config.provider === 'ollama' ? 'http://localhost:11434' : 'https://api.openai.com'}
              />
            </div>

            {showKeyField && (
              <div className="space-y-1">
                <div className="flex items-center gap-1">
                  <Icon name="key" size={12} style={{ color: 'var(--ink-light)' }} />
                  <span className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>API Key</span>
                </div>
                <div className="relative">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => updateConfig({ apiKey: e.target.value })}
                    placeholder="sk-..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1"
                    style={{ color: 'var(--ink-light)' }}
                  >
                    {showApiKey ? <Icon name="eye-off" size={14} /> : <Icon name="eye" size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Icon name="database" size={12} style={{ color: 'var(--ink-light)' }} />
                <span className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>模型</span>
              </div>
              <Input
                value={config.model}
                onChange={(e) => updateConfig({ model: e.target.value })}
                placeholder={config.provider === 'ollama' ? 'llama3' : 'gpt-3.5-turbo'}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>启用 AI</span>
              <Checkbox
                checked={config.enabled}
                onChange={(v) => {
                  updateConfig({ enabled: v })
                  if (!v) setConnectionStatus('unconfigured')
                }}
              />
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={handleTest} disabled={testing || !config.apiBaseUrl || !config.model}>
                {testing ? <Spinner size={14} /> : <Icon name="wifi" size={14} />}
                测试连接
              </Button>
              {testMessage && (
                <span className="text-xs font-hand" style={{
                  color: connectionStatus === 'connected' ? 'var(--accent-green, #22c55e)' : 'var(--accent-red, #ef4444)'
                }}>
                  {testMessage}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function AIPanel() {
  const [taskInput, setTaskInput] = useState('')
  const [decomposition, setDecomposition] = useState<TaskDecomposition | null>(null)
  const [decomposing, setDecomposing] = useState(false)

  const handleDecompose = async () => {
    if (!taskInput.trim()) return
    if (isAIEnabled()) {
      setDecomposing(true)
      try {
        const result = await decomposeTaskAI(taskInput.trim())
        setDecomposition(result)
      } catch {
        setDecomposition(decomposeTask(taskInput.trim()))
      } finally {
        setDecomposing(false)
      }
    } else {
      setDecomposition(decomposeTask(taskInput.trim()))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon name="brain" size={20} className="text-primary-500" />
        <h3 className="text-sm font-semibold text-surface-900 dark:text-surface-100">AI 助手</h3>
      </div>

      <AIConfigSection />

      <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          自然语言创建任务
        </label>
        <NLPInput
          onSubmit={(result) => {
            console.log('NLP result:', result)
          }}
        />
      </div>

      <div className="border-t border-surface-200 dark:border-surface-700 pt-4">
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          任务拆解
        </label>
        <div className="flex items-center gap-2">
          <Input
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDecompose()}
            placeholder="输入任务名称进行拆解..."
          />
          <Button size="sm" onClick={handleDecompose} disabled={!taskInput.trim() || decomposing}>
            {decomposing ? <Spinner size={14} /> : <Icon name="sparkle" size={14} />}
            {isAIEnabled() ? 'AI拆解' : '拆解'}
          </Button>
        </div>

        {decomposition && (
          <div className="mt-3 p-3 bg-surface-50 dark:bg-surface-800/50 rounded-lg">
            <div className="text-sm font-medium text-surface-900 dark:text-surface-100 mb-2">
              {decomposition.parentTitle}
            </div>
            <div className="space-y-1.5">
              {decomposition.subtasks.map((sub, index) => (
                <div key={index} className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                  <span className="w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 flex items-center justify-center text-xs font-medium shrink-0">
                    {index + 1}
                  </span>
                  {sub}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

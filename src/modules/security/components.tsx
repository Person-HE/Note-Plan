import React, { useState } from 'react'
import { Icon } from '@/shared/Icons'
import { cn } from '@/shared'
import { Button, Input, Modal } from '@/shared/components'
import { useSecurityStore } from './store'

export function PrivacyToggle() {
  const store = useSecurityStore()
  const settings = useSecurityStore(s => s.settings)
  const isVerified = useSecurityStore(s => s.isVerified)
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  const handleToggle = () => {
    if (!settings.isPrivacyMode) {
      if (store.hasPassword()) {
        setShowPasswordModal(true)
      } else {
        setShowPasswordModal(true)
      }
    } else {
      store.setPrivacyMode(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between p-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
        <div className="flex items-center gap-3">
          <div className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center',
            settings.isPrivacyMode
              ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-surface-100 text-surface-400 dark:bg-surface-700'
          )}>
            {settings.isPrivacyMode ? <Icon name="shield" size={16} /> : <Icon name="unlock" size={16} />}
          </div>
          <div>
            <div className="text-sm font-medium text-surface-900 dark:text-surface-100">隐私模式</div>
            <div className="text-xs text-surface-500 dark:text-surface-400">
              {settings.isPrivacyMode ? '已开启，敏感内容已隐藏' : '关闭中'}
            </div>
          </div>
        </div>
        <button
          onClick={handleToggle}
          className={cn(
            'relative w-11 h-6 rounded-full transition-colors duration-200',
            settings.isPrivacyMode ? 'bg-green-500' : 'bg-surface-300 dark:bg-surface-600'
          )}
        >
          <span className={cn(
            'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
            settings.isPrivacyMode ? 'translate-x-[22px]' : 'translate-x-0.5'
          )} />
        </button>
      </div>

      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onSuccess={() => {
          store.setPrivacyMode(true)
          setShowPasswordModal(false)
        }}
      />
    </>
  )
}

export function PasswordModal({
  isOpen,
  onClose,
  onSuccess,
  mode = 'verify',
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  mode?: 'verify' | 'set'
}) {
  const store = useSecurityStore()
  const hasPassword = useSecurityStore(s => s.hasPassword())
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const actualMode = mode === 'set' || !hasPassword ? 'set' : 'verify'

  const handleSubmit = async () => {
    setError('')

    if (actualMode === 'set') {
      if (password.length < 4) {
        setError('密码至少4位')
        return
      }
      if (password !== confirmPassword) {
        setError('两次密码不一致')
        return
      }
      await store.setPassword(password)
      store.setPrivacyMode(true)
      onSuccess()
    } else {
      const isValid = await store.verifyPassword(password)
      if (isValid) {
        onSuccess()
      } else {
        setError('密码错误')
      }
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={actualMode === 'set' ? '设置隐私密码' : '验证密码'}
      size="sm"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!password.trim()}>
            {actualMode === 'set' ? '设置' : '验证'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <Icon name="key" size={20} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            {actualMode === 'set'
              ? '设置密码后，查看隐私内容时需要验证身份'
              : '请输入密码以查看隐私内容'}
          </p>
        </div>

        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            placeholder="输入密码"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-[38px] text-surface-400 hover:text-surface-600 transition-colors"
          >
            {showPassword ? <Icon name="eye-off" size={16} /> : <Icon name="eye" size={16} />}
          </button>
        </div>

        {actualMode === 'set' && (
          <Input
            type={showPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
            placeholder="确认密码"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
            <Icon name="warning" size={14} />
            {error}
          </div>
        )}
      </div>
    </Modal>
  )
}

export function ProtectedContent({
  children,
  fallback,
}: {
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const settings = useSecurityStore(s => s.settings)
  const isVerified = useSecurityStore(s => s.isVerified)
  const [showModal, setShowModal] = useState(false)

  if (!settings.isPrivacyMode) {
    return <>{children}</>
  }

  if (isVerified) {
    return <>{children}</>
  }

  return (
    <>
      <div
        onClick={() => setShowModal(true)}
        className="cursor-pointer select-none"
      >
        {fallback ?? (
          <div className="flex items-center gap-2 text-surface-400 dark:text-surface-500">
            <Icon name="lock" size={14} />
            <span className="text-sm">{'*'.repeat(8)}</span>
          </div>
        )}
      </div>

      <PasswordModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={() => setShowModal(false)}
      />
    </>
  )
}

import { create } from 'zustand'
import { eventBus } from '@/core'
import type { PrivacySettings } from './types'

async function simpleHash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input + '__note_plan_salt__')
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

const PASSWORD_STORAGE_KEY = 'note-plan-password-hash'

interface SecurityState {
  settings: PrivacySettings
  isVerified: boolean
  isLoading: boolean

  init: () => Promise<void>
  setPrivacyMode: (enabled: boolean) => void
  setLocalOnly: (enabled: boolean) => void
  setEncryption: (enabled: boolean) => void
  setPassword: (password: string) => Promise<void>
  verifyPassword: (password: string) => Promise<boolean>
  hasPassword: () => boolean
  lock: () => void
}

export const useSecurityStore = create<SecurityState>((set, get) => ({
  settings: {
    isPrivacyMode: false,
    isLocalOnly: true,
    encryptionEnabled: false,
  },
  isVerified: false,
  isLoading: false,

  init: async () => {
    try {
      const stored = localStorage.getItem('note-plan-privacy-settings')
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<PrivacySettings>
        set(state => ({
          settings: { ...state.settings, ...parsed },
        }))
      }
    } catch {
      console.error('Failed to load privacy settings')
    }
  },

  setPrivacyMode: (enabled) => {
    set(state => {
      const newSettings = { ...state.settings, isPrivacyMode: enabled }
      localStorage.setItem('note-plan-privacy-settings', JSON.stringify(newSettings))
      return { settings: newSettings, isVerified: enabled ? state.isVerified : false }
    })
    eventBus.emit('settings:changed', { key: 'isPrivacyMode', value: enabled })
  },

  setLocalOnly: (enabled) => {
    set(state => {
      const newSettings = { ...state.settings, isLocalOnly: enabled }
      localStorage.setItem('note-plan-privacy-settings', JSON.stringify(newSettings))
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { key: 'isLocalOnly', value: enabled })
  },

  setEncryption: (enabled) => {
    set(state => {
      const newSettings = { ...state.settings, encryptionEnabled: enabled }
      localStorage.setItem('note-plan-privacy-settings', JSON.stringify(newSettings))
      return { settings: newSettings }
    })
    eventBus.emit('settings:changed', { key: 'encryptionEnabled', value: enabled })
  },

  setPassword: async (password) => {
    const hash = await simpleHash(password)
    localStorage.setItem(PASSWORD_STORAGE_KEY, hash)
  },

  verifyPassword: async (password) => {
    const storedHash = localStorage.getItem(PASSWORD_STORAGE_KEY)
    if (!storedHash) return false
    const inputHash = await simpleHash(password)
    const isValid = inputHash === storedHash
    if (isValid) {
      set({ isVerified: true })
    }
    return isValid
  },

  hasPassword: () => {
    return !!localStorage.getItem(PASSWORD_STORAGE_KEY)
  },

  lock: () => {
    set({ isVerified: false })
  },
}))

import React, { useEffect, useState } from 'react'
import { useTaskStore } from '@/modules/task'
import { useInspirationStickyStore } from '@/modules/inspiration-sticky'
import { useNoteStore } from '@/modules/note'
import { useNotificationStore } from '@/modules/notification'
import { FloatingWindow } from './FloatingWindow'

export function FloatingApp() {
  const taskStore = useTaskStore()
  const inspirationStickyStore = useInspirationStickyStore()
  const noteStore = useNoteStore()
  const notificationStore = useNotificationStore()
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const init = async () => {
      await taskStore.loadAll()
      await inspirationStickyStore.loadAll()
      await noteStore.loadAll()
      await notificationStore.loadAll()
      setIsReady(true)
    }
    init()
  }, [])

  if (!isReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'transparent' }}>
        <span className="font-hand text-sm" style={{ color: 'var(--ink-gray)' }}>加载中...</span>
      </div>
    )
  }

  return <FloatingWindow />
}

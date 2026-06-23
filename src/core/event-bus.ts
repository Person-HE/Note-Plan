type EventCallback = (...args: unknown[]) => void

class EventBus {
  private listeners: Map<string, Set<EventCallback>> = new Map()

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => this.off(event, callback)
  }

  off(event: string, callback: EventCallback): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.delete(callback)
      if (listeners.size === 0) {
        this.listeners.delete(event)
      }
    }
  }

  emit(event: string, ...args: unknown[]): void {
    const listeners = this.listeners.get(event)
    if (listeners) {
      listeners.forEach(cb => {
        try {
          cb(...args)
        } catch (err) {
          console.error(`[EventBus] Error in handler for "${event}":`, err)
        }
      })
    }
  }

  once(event: string, callback: EventCallback): () => void {
    const wrapper: EventCallback = (...args) => {
      this.off(event, wrapper)
      callback(...args)
    }
    return this.on(event, wrapper)
  }
}

export const eventBus = new EventBus()

export type AppEvent =
  | 'task:created'
  | 'task:updated'
  | 'task:deleted'
  | 'task:completed'
  | 'task:progress-changed'
  | 'task:migrated'
  | 'group:created'
  | 'group:updated'
  | 'group:deleted'
  | 'tag:created'
  | 'tag:updated'
  | 'tag:deleted'
  | 'reminder:triggered'
  | 'reminder:snoozed'
  | 'reminder:dismissed'
  | 'achievement:unlocked'
  | 'streak:updated'
  | 'settings:changed'
  | 'view:changed'
  | 'notification:show'
  | 'notification:dismiss'

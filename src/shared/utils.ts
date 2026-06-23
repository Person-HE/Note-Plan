export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function debounce<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout>
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export function throttle<T extends (...args: any[]) => any>(fn: T, delay: number): (...args: Parameters<T>) => void {
  let lastCall = 0
  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      fn(...args)
    }
  }
}

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}分钟`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

export function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function calculateBufferTime(estimatedMinutes: number): number {
  return Math.ceil(estimatedMinutes * 0.2)
}

export const ENCOURAGEMENT_QUOTES = [
  '每完成一个小任务，都是向目标迈进的一大步 ★',
  '今天的努力，是明天的底气 ♦',
  '不必完美，只需开始 ☆',
  '你比想象中更接近终点',
  '休息也是效率的一部分',
  '一次只做一件事，做到最好',
  '拖延不可怕，可怕的是不去面对',
  '每一个完成的事项，都值得庆祝',
  '慢慢来，比较快',
  '你已经做得很好了，继续加油',
  '专注当下，未来可期',
  '小步前进，终将抵达',
  '给自己一个微笑，你值得',
  '困难是暂时的，成长是永久的',
  '今天又是充满可能的一天',
]

export const GROUP_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
]

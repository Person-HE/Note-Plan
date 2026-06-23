import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, subDays } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export function formatDate(date: string | Date, pattern: string = 'yyyy-MM-dd'): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, pattern, { locale: zhCN })
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return '今天'
  if (isTomorrow(d)) return '明天'
  if (isYesterday(d)) return '昨天'
  return formatDistanceToNow(d, { addSuffix: true, locale: zhCN })
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'HH:mm')
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, 'yyyy-MM-dd HH:mm', { locale: zhCN })
}

export function getWeekDays(date: Date = new Date()): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  const end = endOfWeek(date, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end })
}

export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  const d = parseISO(dueDate)
  return d < new Date() && !isToday(d)
}

export function isDueToday(dueDate: string | null): boolean {
  if (!dueDate) return false
  return isToday(parseISO(dueDate))
}

export function isDueTomorrow(dueDate: string | null): boolean {
  if (!dueDate) return false
  return isTomorrow(parseISO(dueDate))
}

export function isDueThisWeek(dueDate: string | null): boolean {
  if (!dueDate) return false
  const d = parseISO(dueDate)
  const now = new Date()
  const start = startOfWeek(now, { weekStartsOn: 1 })
  const end = endOfWeek(now, { weekStartsOn: 1 })
  return d >= start && d <= end
}

export function getDaysUntilDue(dueDate: string | null): number | null {
  if (!dueDate) return null
  const d = parseISO(dueDate)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function toISODateString(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function toISODateTimeString(date: Date): string {
  return date.toISOString()
}

export { isToday, isTomorrow, isYesterday, isSameDay, parseISO, addDays, subDays, startOfWeek, endOfWeek, format, eachDayOfInterval }

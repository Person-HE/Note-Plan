import { create } from 'zustand'
import { db, type TaskRecord } from '@/core'
import { toISODateString, formatMinutes } from '@/shared'
import { startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, parseISO, subDays } from '@/shared/date-utils'
import type {
  TaskStats,
  TimeDistribution,
  HeatmapCell,
  PriorityDistribution,
  DailySnapshot,
  WeeklyReport,
  ExportFormat,
  ExportOptions,
  StatisticsState,
} from './types'

function computeStats(tasks: TaskRecord[]): TaskStats {
  // 统计基数：排除已取消的任务（已取消任务不应影响完成率、预估时长等指标）
  const effectiveTasks = tasks.filter(t => t.status !== 'cancelled')
  const totalTasks = effectiveTasks.length
  const completedTasks = effectiveTasks.filter(t => t.status === 'completed').length
  const inProgressTasks = effectiveTasks.filter(t => t.status === 'in_progress').length
  const pendingTasks = effectiveTasks.filter(t => t.status === 'pending').length
  const cancelledTasks = tasks.filter(t => t.status === 'cancelled').length
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  const today = toISODateString(new Date())
  const overdueTasks = effectiveTasks.filter(t =>
    t.status !== 'completed' &&
    t.dueDate && t.dueDate.trim() !== '' && t.dueDate < today
  ).length

  // 预估时长：只统计有效任务（排除已取消）
  const totalEstimatedMinutes = effectiveTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 0), 0)
  // 实际专注时长：只统计已完成的任务（未完成的 actualMinutes 通常为 0 或无意义）
  const totalActualMinutes = completedTasks > 0
    ? effectiveTasks.filter(t => t.status === 'completed').reduce((sum, t) => sum + (t.actualMinutes || 0), 0)
    : 0

  const completedWithTime = effectiveTasks.filter(t => t.status === 'completed' && t.actualMinutes > 0)
  const averageCompletionMinutes = completedWithTime.length > 0
    ? Math.round(completedWithTime.reduce((sum, t) => sum + t.actualMinutes, 0) / completedWithTime.length)
    : 0

  return {
    totalTasks,
    completedTasks,
    completionRate,
    inProgressTasks,
    pendingTasks,
    cancelledTasks,
    overdueTasks,
    totalEstimatedMinutes,
    totalActualMinutes,
    averageCompletionMinutes,
  }
}

function computeTimeDistribution(tasks: TaskRecord[]): TimeDistribution {
  const cells: HeatmapCell[] = []
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const grid: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0))

  for (const task of tasks) {
    const timestamps: string[] = []
    if (task.startedAt && task.startedAt.trim() !== '') timestamps.push(task.startedAt)
    if (task.completedAt && task.completedAt.trim() !== '') timestamps.push(task.completedAt)
    if (timestamps.length === 0 && task.createdAt && task.createdAt.trim() !== '') timestamps.push(task.createdAt)

    for (const ts of timestamps) {
      try {
        const date = parseISO(ts)
        if (isNaN(date.getTime())) continue
        const dayIndex = days.findIndex(d => isSameDay(d, date))
        if (dayIndex === -1) continue
        const hour = date.getHours()
        const minutesToAdd = task.actualMinutes > 0
          ? task.actualMinutes / Math.max(timestamps.length, 1)
          : task.estimatedMinutes > 0
            ? task.estimatedMinutes / Math.max(timestamps.length, 1)
            : 15
        grid[dayIndex][hour] += minutesToAdd
      } catch {
        continue
      }
    }
  }

  let maxValue = 0
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      if (grid[d][h] > maxValue) maxValue = grid[d][h]
      cells.push({ day: d, hour: h, value: Math.round(grid[d][h]) })
    }
  }

  return { cells, maxValue: Math.round(maxValue) }
}

function computePriorityDistribution(tasks: TaskRecord[]): PriorityDistribution {
  const urgent = tasks.filter(t => t.priority === 'urgent').length
  const high = tasks.filter(t => t.priority === 'high').length
  const medium = tasks.filter(t => t.priority === 'medium').length
  const low = tasks.filter(t => t.priority === 'low').length
  return { urgent, high, medium, low, total: tasks.length }
}

function computeDailySnapshots(tasks: TaskRecord[], startDate: Date, endDate: Date): DailySnapshot[] {
  const days = eachDayOfInterval({ start: startDate, end: endDate })
  return days.map(day => {
    const dayStr = format(day, 'yyyy-MM-dd')
    const dueTasks = tasks.filter(t => t.dueDate && t.dueDate.trim() !== '' && t.dueDate === dayStr)
    const completed = dueTasks.filter(t => t.status === 'completed')
    const total = dueTasks.length
    return {
      date: dayStr,
      totalTasks: total,
      completedTasks: completed.length,
      completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
      totalActualMinutes: completed.reduce((sum, t) => sum + t.actualMinutes, 0),
    }
  })
}

function generateMarkdownReport(report: WeeklyReport): string {
  const lines: string[] = []
  lines.push(`# 周报：${report.weekStart} ~ ${report.weekEnd}`)
  lines.push('')
  lines.push('## [统计] 总览')
  lines.push('')
  lines.push(`| 指标 | 数值 |`)
  lines.push(`|------|------|`)
  lines.push(`| 任务总数 | ${report.stats.totalTasks} |`)
  lines.push(`| 已完成 | ${report.stats.completedTasks} |`)
  lines.push(`| 完成率 | ${report.stats.completionRate}% |`)
  lines.push(`| 进行中 | ${report.stats.inProgressTasks} |`)
  lines.push(`| 待办 | ${report.stats.pendingTasks} |`)
  lines.push(`| 逾期 | ${report.stats.overdueTasks} |`)
  lines.push(`| 专注时长 | ${formatMinutes(report.totalFocusMinutes)} |`)
  lines.push(`| 连续天数 | ${report.streakDays}天 |`)
  lines.push('')

  lines.push('## [优先级] 优先级分布')
  lines.push('')
  const pd = report.priorityDistribution
  lines.push(`- [高] 紧急：${pd.urgent} (${pd.total > 0 ? Math.round(pd.urgent / pd.total * 100) : 0}%)`)
  lines.push(`- 🟠 高：${pd.high} (${pd.total > 0 ? Math.round(pd.high / pd.total * 100) : 0}%)`)
  lines.push(`- [中] 中：${pd.medium} (${pd.total > 0 ? Math.round(pd.medium / pd.total * 100) : 0}%)`)
  lines.push(`- [低] 低：${pd.low} (${pd.total > 0 ? Math.round(pd.low / pd.total * 100) : 0}%)`)
  lines.push('')

  if (report.dailySnapshots.length > 0) {
    lines.push('## [日期] 每日快照')
    lines.push('')
    lines.push('| 日期 | 任务数 | 完成 | 完成率 | 专注时长 |')
    lines.push('|------|--------|------|--------|----------|')
    for (const snap of report.dailySnapshots) {
      lines.push(`| ${snap.date} | ${snap.totalTasks} | ${snap.completedTasks} | ${snap.completionRate}% | ${formatMinutes(snap.totalActualMinutes)} |`)
    }
    lines.push('')
  }

  if (report.topCompletedTasks.length > 0) {
    lines.push('## [完成] 已完成任务')
    lines.push('')
    for (const title of report.topCompletedTasks) {
      lines.push(`- ${title}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

function generateCSVReport(report: WeeklyReport): string {
  const lines: string[] = []
  lines.push('日期,任务总数,已完成,完成率,专注时长(分钟)')
  for (const snap of report.dailySnapshots) {
    lines.push(`${snap.date},${snap.totalTasks},${snap.completedTasks},${snap.completionRate},${snap.totalActualMinutes}`)
  }
  lines.push('')
  lines.push(`优先级,数量,占比`)
  const pd = report.priorityDistribution
  lines.push(`紧急,${pd.urgent},${pd.total > 0 ? Math.round(pd.urgent / pd.total * 100) : 0}%`)
  lines.push(`高,${pd.high},${pd.total > 0 ? Math.round(pd.high / pd.total * 100) : 0}%`)
  lines.push(`中,${pd.medium},${pd.total > 0 ? Math.round(pd.medium / pd.total * 100) : 0}%`)
  lines.push(`低,${pd.low},${pd.total > 0 ? Math.round(pd.low / pd.total * 100) : 0}%`)
  return lines.join('\n')
}

function generateHTMLReport(report: WeeklyReport): string {
  const pd = report.priorityDistribution
  const urgentPct = pd.total > 0 ? Math.round(pd.urgent / pd.total * 100) : 0
  const highPct = pd.total > 0 ? Math.round(pd.high / pd.total * 100) : 0
  const mediumPct = pd.total > 0 ? Math.round(pd.medium / pd.total * 100) : 0
  const lowPct = pd.total > 0 ? Math.round(pd.low / pd.total * 100) : 0

  let snapshotRows = ''
  for (const snap of report.dailySnapshots) {
    snapshotRows += `
      <tr>
        <td>${snap.date}</td>
        <td>${snap.totalTasks}</td>
        <td>${snap.completedTasks}</td>
        <td>${snap.completionRate}%</td>
        <td>${formatMinutes(snap.totalActualMinutes)}</td>
      </tr>`
  }

  let completedList = ''
  for (const title of report.topCompletedTasks) {
    completedList += `<li>${title}</li>`
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>周报：${report.weekStart} ~ ${report.weekEnd}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 2rem; background: #f8fafc; color: #1e293b; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    h2 { font-size: 1.2rem; margin: 1.5rem 0 0.75rem; color: #475569; }
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem; }
    .stat-card { background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .stat-card .value { font-size: 1.5rem; font-weight: 700; color: #3b82f6; }
    .stat-card .label { font-size: 0.8rem; color: #94a3b8; margin-top: 0.25rem; }
    table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th { background: #f1f5f9; padding: 0.75rem 1rem; text-align: left; font-size: 0.85rem; color: #64748b; }
    td { padding: 0.75rem 1rem; border-top: 1px solid #f1f5f9; font-size: 0.9rem; }
    .priority-bar { display: flex; height: 24px; border-radius: 12px; overflow: hidden; margin: 0.5rem 0; }
    .priority-bar div { display: flex; align-items: center; justify-content: center; font-size: 0.7rem; color: white; font-weight: 600; }
    ul { list-style: none; padding: 0; }
    li { padding: 0.5rem 0; border-bottom: 1px solid #f1f5f9; }
    li::before { content: '[完成] '; }
  </style>
</head>
<body>
  <h1>[统计] 周报：${report.weekStart} ~ ${report.weekEnd}</h1>

  <div class="stats-grid">
    <div class="stat-card"><div class="value">${report.stats.totalTasks}</div><div class="label">任务总数</div></div>
    <div class="stat-card"><div class="value">${report.stats.completedTasks}</div><div class="label">已完成</div></div>
    <div class="stat-card"><div class="value">${report.stats.completionRate}%</div><div class="label">完成率</div></div>
    <div class="stat-card"><div class="value">${report.stats.inProgressTasks}</div><div class="label">进行中</div></div>
    <div class="stat-card"><div class="value">${report.stats.overdueTasks}</div><div class="label">逾期</div></div>
    <div class="stat-card"><div class="value">${formatMinutes(report.totalFocusMinutes)}</div><div class="label">专注时长</div></div>
    <div class="stat-card"><div class="value">${report.streakDays}天</div><div class="label">连续天数</div></div>
  </div>

  <h2>[优先级] 优先级分布</h2>
  <div class="priority-bar">
    ${urgentPct > 0 ? `<div style="width:${urgentPct}%;background:#ef4444;">${urgentPct}%</div>` : ''}
    ${highPct > 0 ? `<div style="width:${highPct}%;background:#f97316;">${highPct}%</div>` : ''}
    ${mediumPct > 0 ? `<div style="width:${mediumPct}%;background:#3b82f6;">${mediumPct}%</div>` : ''}
    ${lowPct > 0 ? `<div style="width:${lowPct}%;background:#94a3b8;">${lowPct}%</div>` : ''}
  </div>
  <p style="font-size:0.85rem;color:#64748b;">紧急 ${pd.urgent} | 高 ${pd.high} | 中 ${pd.medium} | 低 ${pd.low}</p>

  <h2>[日期] 每日快照</h2>
  <table>
    <thead><tr><th>日期</th><th>任务数</th><th>完成</th><th>完成率</th><th>专注时长</th></tr></thead>
    <tbody>${snapshotRows}</tbody>
  </table>

  ${report.topCompletedTasks.length > 0 ? `
  <h2>[完成] 已完成任务</h2>
  <ul>${completedList}</ul>
  ` : ''}
</body>
</html>`
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const useStatisticsStore = create<StatisticsState>((set, get) => ({
  isLoading: false,
  currentStats: null,
  weeklyStats: null,
  monthlyStats: null,
  timeDistribution: null,
  priorityDistribution: null,
  weeklyReport: null,
  dailySnapshots: [],

  loadStatistics: async () => {
    if (get().isLoading) return

    set({ isLoading: true })
    try {
      const allTasks = await db.tasks.toArray()

      const now = new Date()
      const today = toISODateString(now)

      const currentTasks = allTasks.filter(t => {
        const dueToday = t.dueDate && t.dueDate.trim() !== '' && t.dueDate === today
        const createdToday = t.createdAt && t.createdAt.startsWith(today)
        const inProgress = t.status === 'in_progress'
        const overdue = t.status !== 'completed' && t.status !== 'cancelled' && t.dueDate && t.dueDate.trim() !== '' && t.dueDate < today
        return dueToday || createdToday || inProgress || overdue
      })

      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

      const weeklyTasks = allTasks.filter(t => {
        const d = (t.dueDate && t.dueDate.trim() !== '') ? t.dueDate : (t.createdAt ? t.createdAt.slice(0, 10) : '')
        return d >= weekStartStr && d <= weekEndStr
      })

      const monthStart = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd')
      const monthEnd = format(new Date(now.getFullYear(), now.getMonth() + 1, 0), 'yyyy-MM-dd')
      const monthlyTasks = allTasks.filter(t => {
        const d = (t.dueDate && t.dueDate.trim() !== '') ? t.dueDate : (t.createdAt ? t.createdAt.slice(0, 10) : '')
        return d >= monthStart && d <= monthEnd
      })

      let currentStats: TaskStats | null = null
      let weeklyStats: TaskStats | null = null
      let monthlyStats: TaskStats | null = null
      let timeDistribution: TimeDistribution | null = null
      let priorityDistribution: PriorityDistribution | null = null
      let dailySnapshots: DailySnapshot[] = []

      try { currentStats = computeStats(currentTasks) } catch {}
      try { weeklyStats = computeStats(weeklyTasks) } catch {}
      try { monthlyStats = computeStats(monthlyTasks) } catch {}
      try { timeDistribution = computeTimeDistribution(weeklyTasks) } catch {}
      try { priorityDistribution = computePriorityDistribution(weeklyTasks) } catch {}
      try { dailySnapshots = computeDailySnapshots(weeklyTasks, weekStart, weekEnd) } catch {}

      set({
        currentStats,
        weeklyStats,
        monthlyStats,
        timeDistribution,
        priorityDistribution,
        dailySnapshots,
      })
    } catch (err) {
      console.error('Failed to load statistics:', err)
    } finally {
      set({ isLoading: false })
    }
  },

  getWeeklyReport: async () => {
    try {
      const allTasks = await db.tasks.toArray()
      const now = new Date()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 })
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
      const weekStartStr = format(weekStart, 'yyyy-MM-dd')
      const weekEndStr = format(weekEnd, 'yyyy-MM-dd')

      const weeklyTasks = allTasks.filter(t => {
        const d = (t.dueDate && t.dueDate.trim() !== '') ? t.dueDate : (t.createdAt ? t.createdAt.slice(0, 10) : '')
        return d >= weekStartStr && d <= weekEndStr
      })

      const stats = computeStats(weeklyTasks)
      const priorityDistribution = computePriorityDistribution(weeklyTasks)
      const dailySnapshots = computeDailySnapshots(weeklyTasks, weekStart, weekEnd)
      const topCompletedTasks = weeklyTasks
        .filter(t => t.status === 'completed')
        .sort((a, b) => {
          if (b.actualMinutes !== a.actualMinutes) return b.actualMinutes - a.actualMinutes
          return (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
        })
        .slice(0, 10)
        .map(t => t.title)

      const totalFocusMinutes = weeklyTasks
        .filter(t => t.status === 'completed')
        .reduce((sum, t) => sum + t.actualMinutes, 0)

      const streakDays = computeStreakDays(allTasks)

      const report: WeeklyReport = {
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        stats,
        priorityDistribution,
        dailySnapshots,
        topCompletedTasks,
        totalFocusMinutes,
        streakDays,
      }

      set({ weeklyReport: report })
      return report
    } catch (err) {
      console.error('Failed to generate weekly report:', err)
      return null
    }
  },

  exportReport: async (options: ExportOptions) => {
    const report = await get().getWeeklyReport()
    if (!report) return

    const filteredReport: WeeklyReport = {
      ...report,
      dailySnapshots: options.includeDailySnapshots ? report.dailySnapshots : [],
      priorityDistribution: options.includePriority ? report.priorityDistribution : { urgent: 0, high: 0, medium: 0, low: 0, total: 0 },
    }

    let content: string
    let filename: string
    let mimeType: string

    switch (options.format) {
      case 'markdown':
        content = generateMarkdownReport(filteredReport)
        filename = `周报_${report.weekStart}_${report.weekEnd}.md`
        mimeType = 'text/markdown;charset=utf-8'
        break
      case 'csv':
        content = generateCSVReport(filteredReport)
        filename = `周报_${report.weekStart}_${report.weekEnd}.csv`
        mimeType = 'text/csv;charset=utf-8'
        break
      case 'html':
        content = generateHTMLReport(filteredReport)
        filename = `周报_${report.weekStart}_${report.weekEnd}.html`
        mimeType = 'text/html;charset=utf-8'
        break
    }

    downloadBlob(content, filename, mimeType)
  },

  refresh: async () => {
    await get().loadStatistics()
  },
}))

function computeStreakDays(allTasks: TaskRecord[]): number {
  let streak = 0
  const today = new Date()
  let checkDate = new Date(today)

  for (let i = 0; i < 365; i++) {
    const dateStr = format(checkDate, 'yyyy-MM-dd')
    const hasCompleted = allTasks.some(t => t.completedAt && t.completedAt.startsWith(dateStr))
    if (hasCompleted) {
      streak++
      checkDate = subDays(checkDate, 1)
    } else if (i === 0) {
      checkDate = subDays(checkDate, 1)
    } else {
      break
    }
  }

  return streak
}

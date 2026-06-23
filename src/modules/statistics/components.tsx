import { useState, useEffect, useMemo, type ReactNode } from 'react'
import {
  BarChart3, Clock, CheckCircle2, AlertTriangle, TrendingUp,
  Download, FileText, FileSpreadsheet, Globe, Flame, Target,
  Calendar, Activity, RefreshCw, X
} from 'lucide-react'
import { useStatisticsStore } from './store'
import { formatMinutes } from '@/shared'
import { format as formatDateUtil, startOfWeek, endOfWeek } from '@/shared/date-utils'
import type { ExportFormat } from './types'

const DAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function StatCard({
  icon,
  label,
  value,
  subValue,
  color = 'var(--accent-orange)',
  bgColor = 'var(--watercolor-yellow)',
}: {
  icon: ReactNode
  label: string
  value: string | number
  subValue?: string
  color?: string
  bgColor?: string
}) {
  return (
    <div className="card-hand flex items-center gap-3">
      <div
        className="p-2.5"
        style={{
          background: bgColor,
          border: 'var(--border-sketch)',
          borderRadius: 'var(--border-radius-sm)',
        }}
      >
        <div style={{ color }}>{icon}</div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs truncate font-hand" style={{ color: 'var(--ink-gray)' }}>{label}</p>
        <p className="text-xl font-bold font-hand" style={{ color }}>{value}</p>
        {subValue && <p className="text-xs mt-0.5 font-hand" style={{ color: 'var(--ink-light)' }}>{subValue}</p>}
      </div>
    </div>
  )
}

export function StatisticsDashboard() {
  const store = useStatisticsStore()
  const weeklyStats = useStatisticsStore(s => s.weeklyStats)
  const monthlyStats = useStatisticsStore(s => s.monthlyStats)
  const isLoading = useStatisticsStore(s => s.isLoading)
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const stats = period === 'week' ? weeklyStats : monthlyStats

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--accent-orange)' }} />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="text-center py-12 font-hand" style={{ color: 'var(--ink-gray)' }}>
        <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
        <p>暂无统计数据</p>
        <button className="btn-hand mt-2" onClick={() => store.refresh()}>
          <RefreshCw size={14} /> 刷新
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold font-hand flex items-center gap-2" style={{ color: 'var(--ink-black)' }}>
          <BarChart3 size={16} /> 数据看板
        </h3>
        <div className="flex items-center gap-2">
          <select
            className="input-hand"
            style={{ width: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
          >
            <option value="week">本周</option>
            <option value="month">本月</option>
          </select>
          <button className="btn-hand" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => store.refresh()}>
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Target size={20} />}
          label="任务总数"
          value={stats.totalTasks}
          subValue={`完成 ${stats.completedTasks}`}
          color="var(--accent-orange)"
          bgColor="var(--watercolor-yellow)"
        />
        <StatCard
          icon={<CheckCircle2 size={20} />}
          label="完成率"
          value={`${stats.completionRate}%`}
          subValue={`${stats.completedTasks}/${stats.totalTasks}`}
          color="var(--accent-green)"
          bgColor="var(--watercolor-green)"
        />
        <StatCard
          icon={<Clock size={20} />}
          label="专注时长"
          value={formatMinutes(stats.totalActualMinutes)}
          subValue={`预估 ${formatMinutes(stats.totalEstimatedMinutes)}`}
          color="var(--accent-blue)"
          bgColor="var(--watercolor-blue)"
        />
        <StatCard
          icon={<AlertTriangle size={20} />}
          label="逾期任务"
          value={stats.overdueTasks}
          subValue={stats.overdueTasks > 0 ? '需要关注' : '暂无逾期'}
          color={stats.overdueTasks > 0 ? 'var(--accent-red)' : 'var(--ink-light)'}
          bgColor={stats.overdueTasks > 0 ? 'var(--watercolor-pink)' : 'var(--paper-bg)'}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard
          icon={<Activity size={20} />}
          label="进行中"
          value={stats.inProgressTasks}
          color="var(--accent-orange)"
          bgColor="var(--watercolor-yellow)"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="平均完成时长"
          value={stats.averageCompletionMinutes > 0 ? formatMinutes(stats.averageCompletionMinutes) : '--'}
          color="var(--accent-blue)"
          bgColor="var(--watercolor-blue)"
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="待办"
          value={stats.pendingTasks}
          color="var(--accent-blue)"
          bgColor="var(--watercolor-blue)"
        />
      </div>

      <div className="card-hand">
        <p className="text-xs font-hand mb-2" style={{ color: 'var(--ink-gray)' }}>完成进度</p>
        <div
          style={{
            height: '12px',
            background: 'var(--paper-texture)',
            border: 'var(--border-sketch)',
            borderRadius: 'var(--border-radius-sm)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${stats.completionRate}%`,
              background: 'var(--accent-green)',
              borderRadius: 'var(--border-radius-sm)',
              transition: 'width 0.5s ease',
            }}
          />
        </div>
        <p className="text-xs font-hand mt-1 text-right" style={{ color: 'var(--ink-gray)' }}>{stats.completionRate}%</p>
      </div>
    </div>
  )
}

export function TimeHeatmap() {
  const timeDistribution = useStatisticsStore(s => s.timeDistribution)

  const cellMap = useMemo(() => {
    if (!timeDistribution) return new Map<string, number>()
    const map = new Map<string, number>()
    for (const cell of timeDistribution.cells) {
      map.set(`${cell.day}-${cell.hour}`, cell.value)
    }
    return map
  }, [timeDistribution])

  const getColor = (value: number, max: number): string => {
    if (max === 0 || value === 0) return 'var(--paper-texture)'
    const intensity = value / max
    if (intensity > 0.75) return 'var(--accent-green)'
    if (intensity > 0.5) return 'rgba(92, 184, 92, 0.7)'
    if (intensity > 0.25) return 'rgba(92, 184, 92, 0.4)'
    return 'rgba(92, 184, 92, 0.15)'
  }

  if (!timeDistribution) {
    return (
      <div className="card-hand">
        <h3 className="text-sm font-semibold font-hand flex items-center gap-2 mb-4" style={{ color: 'var(--ink-black)' }}>
          <Clock size={16} /> 时间热力图
        </h3>
        <p className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>暂无数据</p>
      </div>
    )
  }

  return (
    <div className="card-hand">
      <h3 className="text-sm font-semibold font-hand flex items-center gap-2 mb-4" style={{ color: 'var(--ink-black)' }}>
        <Clock size={16} /> 时间热力图
      </h3>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="flex items-end gap-0.5 mb-1 pl-12">
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[9px] font-hand" style={{ color: 'var(--ink-light)' }}>{i % 3 === 0 ? `${i}` : ''}</span>
              </div>
            ))}
          </div>

          {DAY_LABELS.map((dayLabel, dayIndex) => (
            <div key={dayIndex} className="flex items-center gap-0.5 mb-0.5">
              <span className="w-10 text-right text-[10px] pr-1 shrink-0 font-hand" style={{ color: 'var(--ink-light)' }}>{dayLabel}</span>
              {Array.from({ length: 24 }, (_, hour) => {
                const value = cellMap.get(`${dayIndex}-${hour}`) ?? 0
                return (
                  <div
                    key={hour}
                    className="flex-1 aspect-square cursor-default min-w-[16px] min-h-[16px]"
                    style={{
                      background: getColor(value, timeDistribution.maxValue),
                      border: '1px solid var(--ink-light)',
                      borderRadius: 'var(--border-radius-sm)',
                    }}
                    title={`${dayLabel} ${hour}:00 - ${value > 0 ? formatMinutes(value) : '无活动'}`}
                  />
                )
              })}
            </div>
          ))}

          <div className="flex items-center gap-2 mt-3 pl-12">
            <span className="text-[10px] font-hand" style={{ color: 'var(--ink-light)' }}>少</span>
            <div className="flex gap-0.5">
              <div className="w-3 h-3" style={{ background: 'var(--paper-texture)', border: '1px solid var(--ink-light)', borderRadius: '2px' }} />
              <div className="w-3 h-3" style={{ background: 'rgba(92, 184, 92, 0.15)', border: '1px solid var(--ink-light)', borderRadius: '2px' }} />
              <div className="w-3 h-3" style={{ background: 'rgba(92, 184, 92, 0.4)', border: '1px solid var(--ink-light)', borderRadius: '2px' }} />
              <div className="w-3 h-3" style={{ background: 'rgba(92, 184, 92, 0.7)', border: '1px solid var(--ink-light)', borderRadius: '2px' }} />
              <div className="w-3 h-3" style={{ background: 'var(--accent-green)', border: '1px solid var(--ink-light)', borderRadius: '2px' }} />
            </div>
            <span className="text-[10px] font-hand" style={{ color: 'var(--ink-light)' }}>多</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function PriorityChart() {
  const priorityDistribution = useStatisticsStore(s => s.priorityDistribution)

  if (!priorityDistribution || priorityDistribution.total === 0) {
    return (
      <div className="card-hand">
        <h3 className="text-sm font-semibold font-hand flex items-center gap-2 mb-4" style={{ color: 'var(--ink-black)' }}>
          <Target size={16} /> 优先级分布
        </h3>
        <p className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>暂无数据</p>
      </div>
    )
  }

  const { urgent, high, medium, low, total } = priorityDistribution
  const urgentPct = Math.round((urgent / total) * 100)
  const highPct = Math.round((high / total) * 100)
  const mediumPct = Math.round((medium / total) * 100)
  const lowPct = Math.round((low / total) * 100)

  const gradientParts: string[] = []
  let accumulated = 0
  const segments = [
    { pct: urgentPct, color: 'var(--accent-red)' },
    { pct: highPct, color: 'var(--accent-orange)' },
    { pct: mediumPct, color: 'var(--accent-blue)' },
    { pct: lowPct, color: 'var(--ink-light)' },
  ]
  for (const seg of segments) {
    if (seg.pct > 0) {
      gradientParts.push(`${seg.color} ${accumulated}% ${accumulated + seg.pct}%`)
      accumulated += seg.pct
    }
  }
  if (gradientParts.length === 0) {
    gradientParts.push('var(--ink-light) 0% 100%')
  }

  const items = [
    { label: '紧急', count: urgent, pct: urgentPct, color: 'var(--accent-red)', textColor: 'var(--accent-red)' },
    { label: '高', count: high, pct: highPct, color: 'var(--accent-orange)', textColor: 'var(--accent-orange)' },
    { label: '中', count: medium, pct: mediumPct, color: 'var(--accent-blue)', textColor: 'var(--accent-blue)' },
    { label: '低', count: low, pct: lowPct, color: 'var(--ink-light)', textColor: 'var(--ink-gray)' },
  ]

  return (
    <div className="card-hand">
      <h3 className="text-sm font-semibold font-hand flex items-center gap-2 mb-4" style={{ color: 'var(--ink-black)' }}>
        <Target size={16} /> 优先级分布
      </h3>

      <div className="flex items-center gap-6">
        <div
          className="w-28 h-28 shrink-0 relative"
          style={{
            background: `conic-gradient(${gradientParts.join(', ')})`,
            border: 'var(--border-sketch)',
            borderRadius: '50%',
          }}
        >
          <div
            className="absolute inset-3 flex items-center justify-center"
            style={{
              background: 'var(--paper-bg)',
              border: 'var(--border-sketch)',
              borderRadius: '50%',
            }}
          >
            <div className="text-center">
              <p className="text-lg font-bold font-hand" style={{ color: 'var(--ink-black)' }}>{total}</p>
              <p className="text-[10px] font-hand" style={{ color: 'var(--ink-light)' }}>总计</p>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          {items.map(item => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 shrink-0"
                style={{
                  background: item.color,
                  border: '1px solid var(--ink-black)',
                  borderRadius: '50%',
                }}
              />
              <span className="text-xs font-hand w-8" style={{ color: 'var(--ink-gray)' }}>{item.label}</span>
              <div className="flex-1">
                <div
                  style={{
                    height: '6px',
                    background: 'var(--paper-texture)',
                    border: '1px solid var(--ink-light)',
                    borderRadius: 'var(--border-radius-sm)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${item.pct}%`,
                      background: item.color,
                      borderRadius: 'var(--border-radius-sm)',
                    }}
                  />
                </div>
              </div>
              <span className="text-xs font-medium font-hand w-14 text-right" style={{ color: item.textColor }}>
                {item.count} ({item.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function WeeklyReport() {
  const store = useStatisticsStore()
  const weeklyReport = useStatisticsStore(s => s.weeklyReport)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (isOpen && !weeklyReport) {
      store.getWeeklyReport()
    }
  }, [isOpen])

  if (!weeklyReport) {
    return (
      <div className="card-hand">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold font-hand flex items-center gap-2" style={{ color: 'var(--ink-black)' }}>
            <FileText size={16} /> 本周总结
          </h3>
          <button className="btn-hand" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => store.getWeeklyReport()}>
            生成报告
          </button>
        </div>
        <p className="text-sm font-hand" style={{ color: 'var(--ink-light)' }}>点击生成查看本周总结</p>
      </div>
    )
  }

  return (
    <div className="card-hand">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold font-hand flex items-center gap-2" style={{ color: 'var(--ink-black)' }}>
          <FileText size={16} /> 本周总结
        </h3>
        <div className="flex items-center gap-2">
          <span className="tag-hand">
            {weeklyReport.weekStart} ~ {weeklyReport.weekEnd}
          </span>
          <button className="btn-hand" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} onClick={() => setIsOpen(true)}>
            详情
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div
          className="text-center p-2"
          style={{
            background: 'var(--watercolor-green)',
            border: 'var(--border-sketch)',
            borderRadius: 'var(--border-radius-sm)',
          }}
        >
          <p className="text-lg font-bold font-hand" style={{ color: 'var(--accent-green)' }}>{weeklyReport.stats.completionRate}%</p>
          <p className="text-[10px] font-hand" style={{ color: 'var(--ink-light)' }}>完成率</p>
        </div>
        <div
          className="text-center p-2"
          style={{
            background: 'var(--watercolor-blue)',
            border: 'var(--border-sketch)',
            borderRadius: 'var(--border-radius-sm)',
          }}
        >
          <p className="text-lg font-bold font-hand" style={{ color: 'var(--accent-blue)' }}>{formatMinutes(weeklyReport.totalFocusMinutes)}</p>
          <p className="text-[10px] font-hand" style={{ color: 'var(--ink-light)' }}>专注时长</p>
        </div>
        <div
          className="text-center p-2"
          style={{
            background: 'var(--watercolor-yellow)',
            border: 'var(--border-sketch)',
            borderRadius: 'var(--border-radius-sm)',
          }}
        >
          <div className="flex items-center justify-center gap-1">
            <Flame size={16} style={{ color: 'var(--accent-orange)' }} />
            <p className="text-lg font-bold font-hand" style={{ color: 'var(--accent-orange)' }}>{weeklyReport.streakDays}</p>
          </div>
          <p className="text-[10px] font-hand" style={{ color: 'var(--ink-light)' }}>连续天数</p>
        </div>
      </div>

      {weeklyReport.topCompletedTasks.length > 0 && (
        <div>
          <p className="text-xs font-hand mb-1" style={{ color: 'var(--ink-gray)' }}>已完成任务</p>
          <div className="space-y-1">
            {weeklyReport.topCompletedTasks.slice(0, 5).map((title, i) => (
              <div key={i} className="flex items-center gap-2 text-xs font-hand" style={{ color: 'var(--ink-black)' }}>
                <CheckCircle2 size={12} style={{ color: 'var(--accent-green)' }} className="shrink-0" />
                <span className="truncate">{title}</span>
              </div>
            ))}
            {weeklyReport.topCompletedTasks.length > 5 && (
              <p className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>还有 {weeklyReport.topCompletedTasks.length - 5} 项...</p>
            )}
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div
            className="relative w-full max-w-lg mx-4 animate-scale-in"
            style={{
              background: 'var(--paper-bg)',
              border: 'var(--border-sketch)',
              borderRadius: 'var(--border-radius-lg)',
              boxShadow: 'var(--shadow-sketch-lg)',
            }}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
              <h2 className="text-lg font-semibold font-hand" style={{ color: 'var(--ink-black)' }}>本周详细报告</h2>
              <button onClick={() => setIsOpen(false)} className="p-1" style={{ color: 'var(--ink-gray)' }}>
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-4 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="p-3"
                  style={{
                    background: 'var(--paper-texture)',
                    border: 'var(--border-sketch)',
                    borderRadius: 'var(--border-radius-sm)',
                  }}
                >
                  <p className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>任务总数</p>
                  <p className="text-xl font-bold font-hand" style={{ color: 'var(--ink-black)' }}>{weeklyReport.stats.totalTasks}</p>
                </div>
                <div
                  className="p-3"
                  style={{
                    background: 'var(--watercolor-green)',
                    border: 'var(--border-sketch)',
                    borderRadius: 'var(--border-radius-sm)',
                  }}
                >
                  <p className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>已完成</p>
                  <p className="text-xl font-bold font-hand" style={{ color: 'var(--accent-green)' }}>{weeklyReport.stats.completedTasks}</p>
                </div>
                <div
                  className="p-3"
                  style={{
                    background: 'var(--watercolor-blue)',
                    border: 'var(--border-sketch)',
                    borderRadius: 'var(--border-radius-sm)',
                  }}
                >
                  <p className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>进行中</p>
                  <p className="text-xl font-bold font-hand" style={{ color: 'var(--accent-blue)' }}>{weeklyReport.stats.inProgressTasks}</p>
                </div>
                <div
                  className="p-3"
                  style={{
                    background: 'var(--watercolor-pink)',
                    border: 'var(--border-sketch)',
                    borderRadius: 'var(--border-radius-sm)',
                  }}
                >
                  <p className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>逾期</p>
                  <p className="text-xl font-bold font-hand" style={{ color: 'var(--accent-red)' }}>{weeklyReport.stats.overdueTasks}</p>
                </div>
              </div>

              {weeklyReport.dailySnapshots.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold font-hand uppercase tracking-wider mb-2" style={{ color: 'var(--ink-gray)' }}>每日快照</h4>
                  <div className="space-y-1">
                    {weeklyReport.dailySnapshots.map(snap => (
                      <div
                        key={snap.date}
                        className="flex items-center gap-3 p-2"
                        style={{
                          borderRadius: 'var(--border-radius-sm)',
                          border: '1px solid transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--watercolor-yellow)'
                          e.currentTarget.style.borderColor = 'var(--ink-light)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.borderColor = 'transparent'
                        }}
                      >
                        <span className="text-xs font-hand w-20 shrink-0" style={{ color: 'var(--ink-gray)' }}>{snap.date}</span>
                        <div className="flex-1">
                          <div
                            style={{
                              height: '8px',
                              background: 'var(--paper-texture)',
                              border: '1px solid var(--ink-light)',
                              borderRadius: 'var(--border-radius-sm)',
                              overflow: 'hidden',
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                width: `${snap.completionRate}%`,
                                background: 'var(--accent-green)',
                                borderRadius: 'var(--border-radius-sm)',
                              }}
                            />
                          </div>
                        </div>
                        <span className="text-xs font-medium font-hand w-16 text-right" style={{ color: 'var(--ink-black)' }}>
                          {snap.completedTasks}/{snap.totalTasks}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function ExportPanel() {
  const store = useStatisticsStore()
  const [format, setFormat] = useState<ExportFormat>('markdown')
  const [isExporting, setIsExporting] = useState(false)

  const now = new Date()
  const weekStart = formatDateUtil(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekEnd = formatDateUtil(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd')

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await store.exportReport({
        format,
        dateRange: { start: weekStart, end: weekEnd },
        includeHeatmap: true,
        includePriority: true,
        includeDailySnapshots: true,
      })
    } finally {
      setIsExporting(false)
    }
  }

  const formatOptions = [
    {
      value: 'markdown',
      label: 'Markdown',
      icon: <FileText size={16} />,
      description: '.md 格式，适合笔记软件',
      color: 'var(--accent-blue)',
      bgColor: 'var(--watercolor-blue)',
    },
    {
      value: 'csv',
      label: 'CSV',
      icon: <FileSpreadsheet size={16} />,
      description: '.csv 格式，适合表格软件',
      color: 'var(--accent-green)',
      bgColor: 'var(--watercolor-green)',
    },
    {
      value: 'html',
      label: 'HTML',
      icon: <Globe size={16} />,
      description: '.html 格式，可视化报告',
      color: 'var(--accent-orange)',
      bgColor: 'var(--watercolor-yellow)',
    },
  ]

  return (
    <div className="card-hand">
      <h3 className="text-sm font-semibold font-hand flex items-center gap-2 mb-4" style={{ color: 'var(--ink-black)' }}>
        <Download size={16} /> 导出报告
      </h3>

      <div className="space-y-2 mb-4">
        {formatOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFormat(opt.value as ExportFormat)}
            className="w-full flex items-center gap-3 p-3 text-left transition-all"
            style={{
              border: format === opt.value ? 'var(--border-sketch)' : '2px dashed var(--ink-light)',
              borderRadius: 'var(--border-radius-md)',
              background: format === opt.value ? opt.bgColor : 'transparent',
              boxShadow: format === opt.value ? 'var(--shadow-sketch-sm)' : 'none',
            }}
          >
            <div
              className="p-2"
              style={{
                background: opt.bgColor,
                border: 'var(--border-sketch)',
                borderRadius: 'var(--border-radius-sm)',
              }}
            >
              <div style={{ color: opt.color }}>{opt.icon}</div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium font-hand" style={{ color: 'var(--ink-black)' }}>{opt.label}</p>
              <p className="text-xs font-hand" style={{ color: 'var(--ink-light)' }}>{opt.description}</p>
            </div>
            {format === opt.value && (
              <div
                className="w-4 h-4 flex items-center justify-center"
                style={{
                  background: 'var(--accent-orange)',
                  border: 'var(--border-sketch)',
                  borderRadius: '50%',
                }}
              >
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--paper-bg)' }} />
              </div>
            )}
          </button>
        ))}
      </div>

      <p className="text-xs font-hand mb-3" style={{ color: 'var(--ink-light)' }}>
        导出范围：{weekStart} ~ {weekEnd}
      </p>

      <button
        className="btn-hand-primary btn-hand w-full"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <><RefreshCw size={14} className="animate-spin" /> 导出中...</>
        ) : (
          <><Download size={14} /> 导出 {formatOptions.find(f => f.value === format)?.label}</>
        )}
      </button>
    </div>
  )
}

export function StatisticsPanel() {
  const store = useStatisticsStore()
  const isLoading = useStatisticsStore(s => s.isLoading)

  useEffect(() => {
    store.loadStatistics()
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <RefreshCw size={32} className="animate-spin mx-auto mb-3" style={{ color: 'var(--accent-orange)' }} />
          <p className="text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>加载统计数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-hand flex items-center gap-2" style={{ color: 'var(--ink-black)' }}>
          <BarChart3 size={20} /> 数据统计
        </h2>
        <button className="btn-hand" onClick={() => store.refresh()}>
          <RefreshCw size={14} /> 刷新
        </button>
      </div>

      <StatisticsDashboard />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TimeHeatmap />
        <PriorityChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyReport />
        <ExportPanel />
      </div>
    </div>
  )
}

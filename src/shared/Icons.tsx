import React from 'react'

interface IconProps {
  name: string
  size?: number
  color?: string
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
}

const STROKE_WIDTH = 1.8

const ICON_PATHS: Record<string, string> = {
  // Navigation & UI
  'menu': 'M3 6h18M3 12h18M3 18h18',
  'close': 'M6 6l12 12M6 18L18 6',
  'back': 'M19 12H5m0 0l7 7m-7-7l7-7',
  'forward': 'M5 12h14m0 0l-7 7m7-7l-7-7',
  'plus': 'M12 5v14m-7-7h14',
  'minus': 'M5 12h14',
  'check': 'M5 13l4 4L19 7',
  'search': 'M11 3a8 8 0 100 16 8 8 0 000-16zm5 5l3 3',
  'filter': 'M3 4h18l-7 8v5l-4 2v-7z',
  'settings': 'M12 15a3 3 0 100-6 3 3 0 000 6zm8-3a8 8 0 01-.2 2l2 1.5-1.7 3-2.3-1a8 8 0 01-1.7 1l-.3 2.5h-3.5l-.3-2.5a8 8 0 01-1.7-1l-2.3 1-1.7-3 2-1.5A8 8 0 014 12a8 8 0 01.2-2l-2-1.5 1.7-3 2.3 1a8 8 0 011.7-1l.3-2.5h3.5l.3 2.5a8 8 0 011.7 1l2.3-1 1.7 3-2 1.5c.1.7.2 1.3.2 2z',
  'more': 'M12 5a1 1 0 110 2 1 1 0 010-2zm0 6a1 1 0 110 2 1 1 0 010-2zm0 6a1 1 0 110 2 1 1 0 010-2z',

  // Task/Todo
  'todo': 'M9 11l3 3L22 4M4 12a8 8 0 1016 0 8 8 0 00-16 0z',
  'task': 'M5 12l5 5L20 7',
  'task-pending': 'M12 5a7 7 0 110 14 7 7 0 010-14z',
  'task-progress': 'M12 5a7 7 0 110 14 7 7 0 010-14M12 5v7l5 3',
  'task-done': 'M12 5a7 7 0 110 14 7 7 0 010-14M9 12l2 2 4-4',
  'priority-high': 'M12 2l3 7h-6l3-7zM11 10v4m0 2v1',
  'priority-medium': 'M12 2l3 7h-6l3-7zM11 10v3m0 2v1',
  'priority-low': 'M12 2l3 7h-6l3-7zM11 10v2m0 2v1',

  // Notes & Documents
  'note': 'M4 4h12l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z',
  'note-edit': 'M4 4h12l4 4v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zM8 13h8M8 17h5',
  'document': 'M6 2h8l6 6v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2z',
  'link': 'M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71',

  // Inspiration & Creative
  'lightbulb': 'M9 21h6m-4-4h2a5 5 0 10-4-8.9A5 5 0 009 13v4h6',
  'star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'idea': 'M12 3a6 6 0 016 6c0 2.5-1.5 4.5-3 6v2a1 1 0 01-1 1h-4a1 1 0 01-1-1v-2c-1.5-1.5-3-3.5-3-6a6 6 0 016-6zM9 20h6',
  'pin': 'M12 2l2 7h5l-4 3 1.5 7L12 15l-4.5 4L9 12l-4-3h5z',

  // Calendar & Time
  'calendar': 'M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM4 9h16M9 2v4M15 2v4',
  'clock': 'M12 5a7 7 0 110 14 7 7 0 010-14zM12 8v4l3 2',
  'alarm': 'M12 6a6 6 0 110 12 6 6 0 010-12zM12 8v4l2 2M5 3l2 2M19 3l-2 2',

  // AI & Brain
  'brain': 'M12 3a7 7 0 017 7c0 2-1 3.5-2 4.5V17a1 1 0 01-1 1h-8a1 1 0 01-1-1v-2.5C6 13.5 5 12 5 10a7 7 0 017-7zM9 21h6M10 18v3M14 18v3',
  'sparkle': 'M12 2l1.5 5H18l-4 3 1.5 5-3.5-2.5L8.5 15l1.5-5-4-3h4.5z',
  'magic': 'M15 4l-3 8-3-4-3 8M3 4h4M17 4h4M3 20h18',

  // Statistics
  'chart': 'M4 20V10M10 20V4M16 20v-8M22 20v-4',
  'chart-pie': 'M12 3a9 9 0 110 18 9 9 0 010-18zM12 3v9h9',
  'trending-up': 'M3 17l6-6 4 4 8-8',
  'trending-down': 'M3 7l6 6 4-4 8 8',

  // Folders & Organization
  'folder': 'M3 7V5a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z',
  'folder-open': 'M3 7V5a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1M3 7h18l-2 11H5L3 7z',
  'tag': 'M4 7h12l4 4-8 8-8-8 4-4z',
  'category': 'M4 6h16M4 12h16M4 18h8',

  // Communication
  'chat': 'M3 5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H7l-4 4V5z',
  'notification': 'M12 3a6 6 0 016 6v3l2 2H4l2-2V9a6 6 0 016-6zM10 19h4a2 2 0 01-4 0z',

  // Actions
  'edit': 'M4 20h16M14 4l4 4L8 18H4v-4L14 4z',
  'delete': 'M5 7h14M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3',
  'copy': 'M8 4h12a1 1 0 011 1v12a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1zM4 8v12a1 1 0 001 1h12',
  'share': 'M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M12 3v12M12 3l4 4M12 3L8 7',
  'download': 'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12M12 15l4-4M12 15l-4-4',
  'upload': 'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 15V3M12 3l4 4M12 3l-4 4',
  'refresh': 'M4 12a8 8 0 0114-5M20 12a8 8 0 01-14 5M4 4v5h5M20 20v-5h-5',

  // Status
  'success': 'M12 3a9 9 0 110 18 9 9 0 010-18zM9 12l2 2 4-4',
  'warning': 'M12 3l9 16H3l9-16zM12 10v3M12 16v1',
  'error': 'M12 3a9 9 0 110 18 9 9 0 010-18zM9 9l6 6M15 9l-6 6',
  'info': 'M12 3a9 9 0 110 18 9 9 0 010-18zM12 8v0M12 11v5',

  // View modes
  'grid': 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  'list': 'M3 6h18M3 12h18M3 18h18',
  'kanban': 'M3 3h5v18H3zM10 3h5v18h-5zM17 3h5v18h-5z',

  // Misc
  'heart': 'M12 5a5 5 0 019 3c0 5-9 9-9 9S3 13 3 8a5 5 0 019-3z',
  'bookmark': 'M5 3h14v18l-7-3-7 3V3z',
  'lock': 'M5 9V7a7 7 0 0114 0v2M5 9h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z',
  'unlock': 'M5 9V7a7 7 0 0114 0M5 9h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z',
  'eye': 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12zM12 9a3 3 0 110 6 3 3 0 010-6z',
  'eye-off': 'M2 12s3-7 10-7c1.5 0 3 .3 4.3.8M2 12s3 7 10 7c1.5 0 3-.3 4.3-.8M2 2l20 20',
  'moon': 'M12 3a9 9 0 109 9 7 7 0 01-9-9z',
  'sun': 'M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4l1.4-1.4M17 7l1.4-1.4M12 8a4 4 0 110 8 4 4 0 010-8z',
  'palette': 'M12 3a9 9 0 110 18c-1 0-1.5-1-1-2l1-2c.5-1 0-2-1-2H8a5 5 0 01-5-5 9 9 0 019-7z',
  'globe': 'M12 3a9 9 0 110 18 9 9 0 010-18zM3 12h18M12 3a14 14 0 014 9 14 14 0 01-4 9 14 14 0 01-4-9 14 14 0 014-9z',
  'database': 'M4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 7c0 1.7 3.6 3 8 3s8-1.3 8-3M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3',
  'zap': 'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
  'target': 'M12 3a9 9 0 110 18 9 9 0 010-18zM12 7a5 5 0 110 10 5 5 0 010-10zM12 11a1 1 0 110 2 1 1 0 010-2z',
  'compass': 'M12 3a9 9 0 110 18 9 9 0 010-18zM16 8l-3 5-5 3 3-5 5-3z',
  'key': 'M8 5a3 3 0 110 6 3 3 0 010-6zM11 8h10M17 8v3M14 8v2',
  'wifi': 'M2 14c4-4 14-4 18 0M6 11c3-3 9-3 12 0M10 8c1.5-1.5 4.5-1.5 6 0M12 16v1',
  'cloud': 'M6 19a4 4 0 01-.5-8 5 5 0 019.5-1 4 4 0 011 8H6z',
  'home': 'M3 12l9-8 9 8M5 10v9a1 1 0 001 1h3v-5h6v5h3a1 1 0 001-1v-9',
  'user': 'M12 5a4 4 0 110 8 4 4 0 010-8zM4 21c0-4 4-7 8-7s8 3 8 7',
  'users': 'M12 5a3 3 0 110 6 3 3 0 010-6M20 21c0-3-3-6-8-6M4 21c0-3 3-6 8-6M17 7a3 3 0 01-2 2.8',
  'image': 'M4 5a2 2 0 012-2h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5zM4 15l4-4 4 4 4-6 4 4',
  'music': 'M9 18V5l12-2v13M6 21a3 3 0 110-6 3 3 0 010 6zM18 19a3 3 0 110-6 3 3 0 010 6z',
  'coffee': 'M3 11h12v7a3 3 0 01-3 3H6a3 3 0 01-3-3v-7zM15 13h2a2 2 0 010 4h-2M7 3v3M11 3v3',
  'rocket': 'M12 2c0 4-2 8-6 11l2 2 2-2 2 2 2-2c-4-3-6-7-6-11zM8 15l-3 3M16 15l3 3M12 2v6',
  'flag': 'M5 4h12l-3 5 3 5H5zM5 4v18',
  'anchor': 'M12 5a3 3 0 110 6 3 3 0 010-6zM12 11v10M5 17a7 7 0 0014 0',
  'puzzle': 'M4 7h3a2 2 0 100-4h2v6H4zM17 7h3v2h-6V3h2a2 2 0 100 4zM7 17H4v-2h6v6H8a2 2 0 100-4zM17 17h3v-6h-6v6h-1a2 2 0 100 4h2v-4z',
  'shield': 'M12 3l8 4v5c0 5-3.5 9.7-8 11-4.5-1.3-8-6-8-11V7l8-4z',
  'paperclip': 'M15 7l-7 7a3 3 0 004 4l7-7a5 5 0 00-7-7l-7 7a7 7 0 0010 10l6.5-6.5',
  'send': 'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z',
  'book': 'M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V5a2.5 2.5 0 012.5-2.5H20v15',
  'book-open': 'M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2zM22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z',
  'attachment': 'M15 7l-7 7a3 3 0 004 4l7-7a5 5 0 00-7-7l-7 7a7 7 0 0010 10l6.5-6.5',
  'export': 'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 3v12M12 3l4 4M12 3L8 7',
  'import': 'M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 15V3M12 15l4-4M12 15l-4-4',
  'running': 'M13 4a1 1 0 110 2 1 1 0 010-2zM7 21l3-7 2.5 2 3-5M10 14l-3 1M17 10l2-1-3 6',
  'phone': 'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.2.9.5 1.7.9 2.5a2 2 0 01-.5 2.1L8 9.6a16 16 0 006.4 6.4l1.3-1.5a2 2 0 012.1-.5c.8.4 1.6.7 2.5.9a2 2 0 011.7 2z',
  'laptop': 'M4 5a2 2 0 012-2h12a2 2 0 012 2v10H4V5zM2 17h20v2H2z',
  'leaf': 'M12 3c0 4-2 8-6 11M12 3c4 3 6 7 6 11M12 3v18M8 8c2 1 4 1 8 0',
  'briefcase': 'M4 7V5a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7z',
  'trophy': 'M6 3h12v5a6 6 0 01-12 0V3zM6 5H3v3a3 3 0 003 3M18 5h3v3a3 3 0 01-3 3M9 13v2a2 2 0 006 0v-2M7 21h10',
  'dot-red': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
  'dot-orange': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
  'dot-blue': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
  'dot-gray': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
}

// Some icons need filled variants
const FILLED_ICONS: Record<string, string> = {
  'star': 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  'heart': 'M12 5a5 5 0 019 3c0 5-9 9-9 9S3 13 3 8a5 5 0 019-3z',
  'dot-red': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
  'dot-orange': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
  'dot-blue': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
  'dot-gray': 'M12 12m-4 0a4 4 0 110 8 4 4 0 010-8z',
}

const FILLED_SET = new Set(Object.keys(FILLED_ICONS))

export const Icon: React.FC<IconProps> = ({ name, size = 20, color, className = '', onClick, style }) => {
  const path = ICON_PATHS[name]
  if (!path) return <span style={{ width: size, height: size, display: 'inline-block' }} />

  const isFilled = FILLED_SET.has(name)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={isFilled ? (color || 'currentColor') : 'none'}
      stroke={isFilled ? 'none' : (color || 'currentColor')}
      strokeWidth={isFilled ? 0 : STROKE_WIDTH}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : undefined, display: 'inline-block', verticalAlign: 'middle', ...style }}
    >
      <path d={path} />
    </svg>
  )
}

// Priority dot colors
export const PRIORITY_COLORS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f97316',
  low: '#3b82f6',
  none: '#9ca3af',
}

// Status icon helper
export const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 16 }) => {
  switch (status) {
    case 'completed':
      return <Icon name="task-done" size={size} color="#22c55e" />
    case 'in_progress':
      return <Icon name="task-progress" size={size} color="#3b82f6" />
    case 'pending':
      return <Icon name="task-pending" size={size} color="#9ca3af" />
    case 'cancelled':
      return <Icon name="close" size={size} color="#ef4444" />
    default:
      return <Icon name="task-pending" size={size} color="#9ca3af" />
  }
}

// Priority icon helper
export const PriorityIcon: React.FC<{ priority: string; size?: number }> = ({ priority, size = 16 }) => {
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.none
  switch (priority) {
    case 'high':
      return <Icon name="priority-high" size={size} color={color} />
    case 'medium':
      return <Icon name="priority-medium" size={size} color={color} />
    case 'low':
      return <Icon name="priority-low" size={size} color={color} />
    default:
      return <Icon name="minus" size={size} color={color} />
  }
}

export default Icon

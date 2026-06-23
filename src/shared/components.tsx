import React, { useState, useRef, useEffect } from 'react'
import { cn } from '@/shared/utils'
import { Icon } from './Icons'

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}) {
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '4px 10px', fontSize: '0.75rem', gap: '4px', minHeight: '28px' },
    md: { padding: '8px 16px', fontSize: '0.875rem', gap: '6px', minHeight: '36px' },
    lg: { padding: '12px 24px', fontSize: '1rem', gap: '8px', minHeight: '44px' },
  }

  const variantStyles: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--accent-orange)', color: 'white', border: 'var(--border-sketch)' },
    secondary: { background: 'var(--paper-bg)', color: 'var(--ink-black)', border: 'var(--border-sketch)' },
    ghost: { background: 'transparent', color: 'var(--ink-gray)', border: '2px solid transparent' },
    danger: { background: 'var(--accent-red)', color: 'white', border: 'var(--border-sketch)' },
    outline: { background: 'transparent', color: 'var(--ink-black)', border: 'var(--border-sketch)' },
  }

  return (
    <button
      className={cn('inline-flex items-center justify-center font-hand font-medium transition-all duration-200 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed', className)}
      style={{
        ...sizeStyles[size],
        ...variantStyles[variant],
        borderRadius: 'var(--border-radius-md)',
        boxShadow: variant !== 'ghost' ? 'var(--shadow-sketch-sm)' : 'none',
      }}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}

export function Input({
  label,
  error,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
}) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium font-hand" style={{ color: 'var(--ink-gray)' }}>{label}</label>}
      <input
        className={cn('input-hand w-full font-hand', className)}
        style={{ color: 'var(--ink-black)' }}
        {...props}
      />
      {error && <p className="text-xs font-hand" style={{ color: 'var(--accent-red)' }}>{error}</p>}
    </div>
  )
}

export function TextArea({
  label,
  error,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
}) {
  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium font-hand" style={{ color: 'var(--ink-gray)' }}>{label}</label>}
      <textarea
        className={cn('input-hand w-full resize-none font-hand', className)}
        style={{ color: 'var(--ink-black)' }}
        {...props}
      />
      {error && <p className="text-xs font-hand" style={{ color: 'var(--accent-red)' }}>{error}</p>}
    </div>
  )
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showClose = true,
  footer,
}: {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showClose?: boolean
  footer?: React.ReactNode
}) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl' }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative w-full mx-4 animate-scale-in', sizeClasses[size])}
        style={{
          background: 'var(--paper-bg)',
          border: 'var(--border-sketch)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--shadow-sketch)',
        }}>
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '2px dashed var(--ink-light)' }}>
            {title && <h2 className="text-lg font-semibold font-hand" style={{ color: 'var(--ink-black)' }}>{title}</h2>}
            {showClose && (
              <button onClick={onClose} className="p-1 rounded transition-colors font-hand" style={{ color: 'var(--ink-gray)' }}>
                <Icon name="close" size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-3 px-6 py-4" style={{ borderTop: '2px dashed var(--ink-light)' }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export function Badge({
  children,
  variant = 'default',
  size = 'sm',
  className,
}: {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md'
  className?: string
}) {
  const variantStyles: Record<string, React.CSSProperties> = {
    default: { background: 'var(--paper-bg)', color: 'var(--ink-gray)', border: 'var(--border-sketch)' },
    primary: { background: 'var(--watercolor-yellow)', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)' },
    success: { background: 'var(--watercolor-green)', color: 'var(--accent-green)', border: '1px solid var(--accent-green)' },
    warning: { background: 'var(--watercolor-yellow)', color: 'var(--ink-black)', border: 'var(--border-sketch)' },
    danger: { background: 'var(--watercolor-pink)', color: 'var(--accent-red)', border: '1px solid var(--accent-red)' },
    info: { background: 'var(--watercolor-blue)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)' },
  }
  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '2px 6px', fontSize: '0.75rem' },
    md: { padding: '4px 10px', fontSize: '0.875rem' },
  }

  return (
    <span className={cn('tag-hand inline-flex items-center font-medium font-hand', className)} style={{ ...variantStyles[variant], ...sizeStyles[size] }}>
      {children}
    </span>
  )
}

export function ProgressRing({
  progress,
  size = 40,
  strokeWidth = 3,
  color,
  bgColor,
  showLabel = true,
}: {
  progress: number
  size?: number
  strokeWidth?: number
  color?: string
  bgColor?: string
  showLabel?: boolean
}) {
  const ringColor = color || 'var(--accent-orange)'
  const ringBgColor = bgColor || 'var(--ink-light)'
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringBgColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={ringColor}
          strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-500"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-medium font-hand" style={{ color: 'var(--ink-black)' }}>
          {Math.round(progress)}%
        </span>
      )}
    </div>
  )
}

export function ProgressBar({
  progress,
  color,
  height = 'h-2',
  showLabel = false,
  animated = true,
}: {
  progress: number
  color?: string
  height?: string
  showLabel?: boolean
  animated?: boolean
}) {
  return (
    <div className="w-full">
      <div className={cn('w-full rounded-full overflow-hidden', height)}
        style={{ background: 'var(--ink-light)', border: '1px solid var(--ink-black)' }}>
        <div
          className={cn('rounded-full transition-all duration-500', height, animated && 'animate-pulse-glow')}
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            background: color || 'var(--accent-orange)',
          }}
        />
      </div>
      {showLabel && <span className="text-xs font-hand mt-1" style={{ color: 'var(--ink-gray)' }}>{Math.round(progress)}%</span>}
    </div>
  )
}

export function Select({
  options,
  value,
  onChange,
  label,
  placeholder = '请选择',
  className,
}: {
  options: { label: string; value: string; color?: string }[]
  value: string
  onChange: (value: string) => void
  label?: string
  placeholder?: string
  className?: string
}) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div className="space-y-1" ref={ref}>
      {label && <label className="block text-sm font-medium font-hand" style={{ color: 'var(--ink-gray)' }}>{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn('w-full flex items-center justify-between font-hand text-sm', className)}
          style={{
            padding: '6px 12px',
            background: 'var(--paper-bg)',
            border: 'var(--border-sketch)',
            borderRadius: 'var(--border-radius-md)',
            color: selected ? 'var(--ink-black)' : 'var(--ink-light)',
          }}
        >
          <span>{selected ? selected.label : placeholder}</span>
          <Icon name="minus" size={16} style={{ color: 'var(--ink-light)', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-1 w-full animate-fade-in"
            style={{
              background: 'var(--paper-bg)',
              border: 'var(--border-sketch)',
              borderRadius: 'var(--border-radius-md)',
              boxShadow: 'var(--shadow-sketch)',
              padding: '4px 0',
              maxHeight: '240px',
              overflow: 'auto',
            }}>
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setIsOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left font-hand transition-colors"
                style={{
                  color: value === option.value ? 'var(--accent-orange)' : 'var(--ink-black)',
                  background: value === option.value ? 'var(--watercolor-yellow)' : 'transparent',
                }}
              >
                {option.color && <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: option.color }} />}
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export function Toast({
  message,
  type = 'info',
  onClose,
}: {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  onClose: () => void
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000)
    return () => clearTimeout(timer)
  }, [onClose])

  const icons = {
    success: <Icon name="check" size={18} />,
    error: <Icon name="warning" size={18} />,
    warning: <Icon name="warning" size={18} />,
    info: <Icon name="info" size={18} />,
  }
  const typeStyles: Record<string, React.CSSProperties> = {
    success: { background: 'var(--watercolor-green)', color: 'var(--accent-green)', borderColor: 'var(--accent-green)' },
    error: { background: 'var(--watercolor-pink)', color: 'var(--accent-red)', borderColor: 'var(--accent-red)' },
    warning: { background: 'var(--watercolor-yellow)', color: 'var(--ink-black)', borderColor: 'var(--accent-orange)' },
    info: { background: 'var(--watercolor-blue)', color: 'var(--accent-blue)', borderColor: 'var(--accent-blue)' },
  }

  return (
    <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 animate-slide-in"
      style={{
        ...typeStyles[type],
        border: 'var(--border-sketch)',
        borderRadius: 'var(--border-radius-md)',
        boxShadow: 'var(--shadow-sketch)',
      }}>
      {icons[type]}
      <span className="text-sm font-medium font-hand">{message}</span>
      <button onClick={onClose} className="ml-2 p-0.5 rounded transition-colors" style={{ color: 'inherit' }}>
        <Icon name="close" size={14} />
      </button>
    </div>
  )
}

export function Tooltip({
  content,
  children,
  position = 'top',
}: {
  content: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
}) {
  const [isVisible, setIsVisible] = useState(false)
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  return (
    <div className="relative inline-flex" onMouseEnter={() => setIsVisible(true)} onMouseLeave={() => setIsVisible(false)}>
      {children}
      {isVisible && (
        <div className={cn('absolute z-50 px-2 py-1 text-xs whitespace-nowrap animate-fade-in font-hand', positionClasses[position])}
          style={{
            color: 'white',
            background: 'var(--ink-black)',
            borderRadius: 'var(--border-radius-sm)',
          }}>
          {content}
        </div>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="mb-4" style={{ color: 'var(--ink-light)' }}>{icon}</div>}
      <h3 className="text-lg font-medium font-hand" style={{ color: 'var(--ink-gray)' }}>{title}</h3>
      {description && <p className="mt-1 text-sm font-hand" style={{ color: 'var(--ink-light)' }}>{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent-orange)' }}>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  className?: string
}) {
  return (
    <label className={cn('inline-flex items-center gap-2 cursor-pointer select-none', className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200"
        style={{
          background: checked ? 'var(--accent-orange)' : 'transparent',
          borderColor: checked ? 'var(--accent-orange)' : 'var(--ink-black)',
          color: checked ? 'white' : 'transparent',
        }}
      >
        {checked && <Icon name="check" size={14} />}
      </button>
      {label && <span className="text-sm font-hand" style={{ color: 'var(--ink-gray)' }}>{label}</span>}
    </label>
  )
}

export function ColorPicker({
  colors,
  selected,
  onChange,
}: {
  colors: string[]
  selected: string
  onChange: (color: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(color => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn('w-7 h-7 rounded-full border-2 transition-all duration-200 hover:scale-110')}
          style={{
            backgroundColor: color,
            borderColor: selected === color ? 'var(--ink-black)' : 'transparent',
            transform: selected === color ? 'scale(1.15)' : undefined,
            boxShadow: selected === color ? 'var(--shadow-sketch-sm)' : 'none',
          }}
        />
      ))}
    </div>
  )
}

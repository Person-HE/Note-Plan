import { useState, useRef, useCallback, useEffect } from 'react'

interface VirtualScrollOptions {
  itemCount: number
  itemHeight: number
  overscan?: number
}

export function useVirtualScroll({ itemCount, itemHeight, overscan = 5 }: VirtualScrollOptions) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerHeight, setContainerHeight] = useState(600)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop)
  }, [])

  const totalHeight = itemCount * itemHeight
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(itemCount - 1, Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan)
  const visibleItems = []
  for (let i = startIndex; i <= endIndex; i++) {
    visibleItems.push({ index: i, offsetTop: i * itemHeight })
  }

  return {
    containerRef,
    containerHeight,
    totalHeight,
    visibleItems,
    startIndex,
    endIndex,
    handleScroll,
  }
}

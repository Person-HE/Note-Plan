import { useState, useEffect } from 'react'
import { detectFormFactor, detectPlatform, isTouchDevice, type FormFactor, type Platform } from '../platform'

export function usePlatform() {
  const [platform, setPlatform] = useState<Platform>(detectPlatform())
  const [formFactor, setFormFactor] = useState<FormFactor>(detectFormFactor())
  const [isTouch, setIsTouch] = useState(isTouchDevice())
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight })

  useEffect(() => {
    const handleResize = () => {
      setFormFactor(detectFormFactor())
      setWindowSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setPlatform(detectPlatform())
    setIsTouch(isTouchDevice())
  }, [])

  return {
    platform,
    formFactor,
    isTouch,
    isPhone: formFactor === 'phone',
    isTablet: formFactor === 'tablet',
    isDesktop: formFactor === 'desktop',
    isIOS: platform === 'ios',
    isAndroid: platform === 'android',
    isElectron: platform === 'electron',
    isWeb: platform === 'web',
    windowSize,
  }
}

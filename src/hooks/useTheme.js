import { useCallback, useEffect, useState } from 'react'

const USER_OVERRIDE_KEY = 'lazarus-theme-override'

function getDeviceTheme() {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      // Clear legacy key that was locking devices into stale theme
      localStorage.removeItem('lazarus-theme')
      const override = localStorage.getItem(USER_OVERRIDE_KEY)
      if (override === 'dark' || override === 'light') return override
    } catch {
      /* ignore */
    }
    return getDeviceTheme()
  })

  // Synchronize <html> element class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // Listen to device mode changes in real-time
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const handleDeviceChange = (e) => {
      const deviceTheme = e.matches ? 'dark' : 'light'
      try {
        localStorage.removeItem(USER_OVERRIDE_KEY)
      } catch {
        /* ignore */
      }
      setTheme(deviceTheme)
    }

    if (media.addEventListener) {
      media.addEventListener('change', handleDeviceChange)
      return () => media.removeEventListener('change', handleDeviceChange)
    } else if (media.addListener) {
      media.addListener(handleDeviceChange)
      return () => media.removeListener(handleDeviceChange)
    }
  }, [])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(USER_OVERRIDE_KEY, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }, [])

  return { theme, toggle }
}

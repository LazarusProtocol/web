import { useCallback, useEffect, useState } from 'react'

const USER_OVERRIDE_KEY = 'lazarus-theme-override-v2'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      localStorage.removeItem('lazarus-theme')
      localStorage.removeItem('lazarus-theme-override')
      const override = localStorage.getItem(USER_OVERRIDE_KEY)
      if (override === 'dark' || override === 'light') return override
    } catch {
      /* ignore */
    }
    return 'light'
  })

  // Synchronize <html> element class
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

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

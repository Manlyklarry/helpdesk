import { createContext, useContext, useState, useLayoutEffect } from 'react'

type ThemeCtx = { isDark: boolean; toggle: () => void }

const ThemeContext = createContext<ThemeCtx>({ isDark: false, toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('helpdesk-theme')
      if (stored) return stored === 'dark'
    } catch {}
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useLayoutEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
    try { localStorage.setItem('helpdesk-theme', isDark ? 'dark' : 'light') } catch {}
  }, [isDark])

  return (
    <ThemeContext.Provider value={{ isDark, toggle: () => setIsDark((d) => !d) }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)

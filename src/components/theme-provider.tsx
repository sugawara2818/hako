'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {}
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  useEffect(() => {
    // Read saved preference, fall back to system preference
    const saved = localStorage.getItem('hako-theme') as Theme | null
    if (saved) {
      apply(saved)
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      apply(prefersDark ? 'dark' : 'light')
    }
  }, [])

  const apply = (t: Theme) => {
    setTheme(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('hako-theme', t)
  }

  const toggleTheme = () => apply(theme === 'dark' ? 'light' : 'dark')

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

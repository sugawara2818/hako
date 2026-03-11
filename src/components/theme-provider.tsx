'use client'

import { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'light'

const ThemeContext = createContext<{ 
  theme: Theme,
  setTheme: (theme: Theme) => void 
}>({ 
  theme: 'dark',
  setTheme: () => {}
})

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark')

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null
    const mq = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = (t: Theme) => {
      setThemeState(t)
      document.documentElement.setAttribute('data-theme', t)
    }

    if (savedTheme) {
      apply(savedTheme)
    } else {
      apply(mq.matches ? 'dark' : 'light')
    }

    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        apply(e.matches ? 'dark' : 'light')
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    localStorage.setItem('theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

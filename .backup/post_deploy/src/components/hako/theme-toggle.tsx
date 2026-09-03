'use client'

import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/components/theme-provider'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex p-1 bg-white/5 rounded-xl gap-1">
      <button
        onClick={() => setTheme('light')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${
          theme === 'light' 
            ? 'bg-white text-black font-bold shadow-sm' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Sun className="w-4 h-4" />
        Light
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm transition-all ${
          theme === 'dark' 
            ? 'bg-white/20 text-white font-bold' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Moon className="w-4 h-4" />
        Dark
      </button>
    </div>
  )
}

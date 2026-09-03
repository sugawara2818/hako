'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

export function PathTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (pathname && typeof window !== 'undefined') {
      localStorage.setItem('hako_last_visited_path', pathname)
    }
  }, [pathname])

  return null
}

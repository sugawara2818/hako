'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function PathTracker() {
  const pathname = usePathname()
  const router = useRouter()
  const hasRestored = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone

    if (isStandalone && pathname === '/' && !hasRestored.current) {
      hasRestored.current = true
      const lastPath = localStorage.getItem('hako_last_visited_path')
      if (lastPath && lastPath !== '/' && lastPath !== 'undefined' && lastPath !== 'null') {
        router.replace(lastPath)
        return
      }
    }

    localStorage.setItem('hako_last_visited_path', pathname)
  }, [pathname, router])

  return null
}

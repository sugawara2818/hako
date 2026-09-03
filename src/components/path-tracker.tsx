'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function PathTracker() {
  const pathname = usePathname()
  const router = useRouter()
  const hasRestored = useRef(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !pathname) return

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone

      if (isStandalone && pathname === '/' && !hasRestored.current) {
        hasRestored.current = true
        const lastPath = localStorage.getItem('hako_last_visited_path')
        if (lastPath && lastPath.startsWith('/') && lastPath !== '/' && lastPath !== 'undefined' && lastPath !== 'null') {
          // Validate that the path is not the bad encoded hakoId directory
          if (!lastPath.includes('%5BhakoId%5D')) {
            router.replace(lastPath)
            return
          }
        }
      }

      // Save the path if it's a valid string
      if (pathname && !pathname.includes('%5BhakoId%5D')) {
        localStorage.setItem('hako_last_visited_path', pathname)
      }
    } catch (e) {
      console.error('Failed to handle path tracking:', e)
    }
  }, [pathname, router])

  return null
}

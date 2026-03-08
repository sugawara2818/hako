'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Hash, LayoutDashboard, Settings, User } from 'lucide-react'
import { InstallButton } from '@/components/hako/install-button'
import { UserMenu } from '@/components/hako/user-menu'
import { MobileSidebar } from '@/components/hako/mobile-sidebar'

interface HakoViewerLayoutProps {
  hakoId: string
  hakoName: string
  email: string
  isOwner: boolean
  memberCount: number
  children: React.ReactNode
}

export function HakoViewerLayout({
  hakoId, hakoName, email, isOwner, memberCount, children
}: HakoViewerLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const touchStartX = useRef<number | null>(null)

  // Swipe from left edge to open sidebar
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches[0].clientX < 32) {
        touchStartX.current = e.touches[0].clientX
      } else {
        touchStartX.current = null
      }
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return
      const dx = e.changedTouches[0].clientX - touchStartX.current
      if (dx > 60) setIsMobileSidebarOpen(true)
      touchStartX.current = null
    }
    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col z-10 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20">H</div>
          <span className="font-bold truncate">{hakoName}</span>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">メニュー</p>
            <Link href={`/hako/${hakoId}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 text-white font-bold transition-all border border-white/5">
              <Hash className="w-5 h-5 text-purple-400" />
              タイムライン
            </Link>
          </div>

          {isOwner && (
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-black text-blue-500/50 uppercase tracking-widest mb-2">管理ツール</p>
              <Link href="/owner/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 transition-all font-bold">
                <LayoutDashboard className="w-5 h-5" /> 一覧へ戻る
              </Link>
              <Link href={`/owner/hako/${hakoId}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-purple-400/70 hover:text-purple-400 hover:bg-purple-500/10 transition-all font-bold">
                <Settings className="w-5 h-5" /> 箱の設定
              </Link>
            </div>
          )}

          <div className="pt-4 px-2">
            <InstallButton variant="sidebar" />
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/40">
          <UserMenu email={email} hakoId={hakoId} isOwner={isOwner} />
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <MobileSidebar
        hakoId={hakoId}
        hakoName={hakoName}
        email={email}
        isOwner={isOwner}
        memberCount={memberCount}
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className={`flex-1 flex flex-col h-screen relative z-10 transition-all duration-200 ${isMobileSidebarOpen ? 'blur-sm pointer-events-none md:blur-none md:pointer-events-auto' : ''}`}>
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 glass sticky top-0 z-50">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20 shrink-0">H</div>
            <span className="font-bold truncate max-w-[120px] text-sm">{hakoName}</span>
          </button>
          <div className="flex items-center gap-1">
            <InstallButton variant="icon" />
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <UserMenu email={email} hakoId={hakoId} isOwner={isOwner} />
          </div>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  )
}

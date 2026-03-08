'use client'

import { getHakoGradient } from '@/lib/hako-utils'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Hash, LayoutDashboard, Settings, ShieldAlert, AtSign } from 'lucide-react'
import { InstallButton } from '@/components/hako/install-button'
import { UserMenu } from '@/components/hako/user-menu'
import { MobileSidebar } from '@/components/hako/mobile-sidebar'

interface HakoViewerLayoutProps {
  hakoId: string
  hakoName: string
  iconUrl: string | null
  iconColor: string | null
  email: string
  isOwner: boolean
  memberCount: number
  displayName: string | null
  children: React.ReactNode
}

const DRAWER_WIDTH = Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 320)
const OPEN_THRESHOLD = 0.4 // 40% of drawer must be visible to snap open

export function HakoViewerLayout({
  hakoId, hakoName, iconUrl, iconColor, email, isOwner, memberCount, displayName, children
}: HakoViewerLayoutProps) {
  const [isOpen, setIsOpen] = useState(false)
  // dragOffset: 0 = closed, 1 = fully open
  const [dragProgress, setDragProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  const touchStartX = useRef<number | null>(null)
  const lastProgress = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const x = e.touches[0].clientX
    // Only start tracking if touching from left edge (open) or when sidebar is open (anywhere)
    if (x < 40 || isOpen) {
      touchStartX.current = x
      setIsDragging(true)
    }
  }, [isOpen])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null) return
    const x = e.touches[0].clientX
    const dx = x - touchStartX.current

    let progress: number
    if (isOpen) {
      // If open, dragging left closes it
      progress = 1 + (dx / DRAWER_WIDTH)
    } else {
      // If closed, dragging right opens it
      progress = dx / DRAWER_WIDTH
    }
    
    progress = Math.max(0, Math.min(1, progress))
    lastProgress.current = progress
    setDragProgress(progress)
  }, [isOpen])

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null) return
    touchStartX.current = null
    setIsDragging(false)

    // Snap open or closed based on threshold
    if (lastProgress.current > OPEN_THRESHOLD) {
      setIsOpen(true)
      setDragProgress(1)
    } else {
      setIsOpen(false)
      setDragProgress(0)
    }
  }, [])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setDragProgress(0)
  }, [])

  // Computed values for animation
  const activeProgress = isDragging ? dragProgress : (isOpen ? 1 : 0)
  const drawerX = -(1 - activeProgress) * DRAWER_WIDTH
  const backdropOpacity = activeProgress * 0.6
  const backdropBlur = activeProgress * 4 // px
  const showBackdrop = activeProgress > 0.01

  const hakoGradient = getHakoGradient(iconColor)

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans overflow-hidden">
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Desktop Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-black/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col z-10 hidden md:flex">
        <div className="h-16 flex items-center px-4 border-b border-white/5 gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20 shrink-0 overflow-hidden ${!iconUrl ? `bg-gradient-to-br ${hakoGradient}` : ''}`}>
            {iconUrl ? <img src={iconUrl} alt="" className="w-full h-full object-cover" /> : hakoName.charAt(0).toUpperCase()}
          </div>
          <span className="font-bold truncate flex-1 text-sm">{hakoName}</span>
          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 ${isOwner ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
            {isOwner ? <ShieldAlert className="w-3 h-3" /> : <AtSign className="w-3 h-3" />}
            {isOwner ? 'Owner' : 'Member'}
          </div>
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
          <UserMenu email={email} hakoId={hakoId} isOwner={isOwner} displayName={displayName} />
        </div>
      </aside>

      {/* Mobile Sidebar Drawer (physics-based) */}
      <div className="md:hidden">
        {/* Blurred backdrop */}
        {showBackdrop && (
          <div
            className="fixed inset-0 z-[140]"
            style={{
              backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
              backdropFilter: `blur(${backdropBlur}px)`,
              WebkitBackdropFilter: `blur(${backdropBlur}px)`,
              transition: isDragging ? 'none' : 'all 0.3s ease',
            }}
            onClick={handleClose}
          />
        )}

        {/* Drawer panel */}
        <div
          className="fixed top-0 left-0 h-full z-[150]"
          style={{
            width: `${DRAWER_WIDTH}px`,
            transform: `translateX(${drawerX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'transform',
          }}
        >
          <MobileSidebar
            hakoId={hakoId}
            hakoName={hakoName}
            iconUrl={iconUrl}
            iconColor={iconColor}
            email={email}
            isOwner={isOwner}
            memberCount={memberCount}
            displayName={displayName}
            isOpen={true}
            onClose={handleClose}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 glass sticky top-0 z-50">
          <button
            onClick={() => { setIsOpen(true); setDragProgress(1) }}
            className="flex items-center gap-2 min-w-0 flex-1 h-full"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20 shrink-0 overflow-hidden ${!iconUrl ? `bg-gradient-to-br ${hakoGradient}` : ''}`}>
              {iconUrl ? <img src={iconUrl} alt="" className="w-full h-full object-cover" /> : hakoName.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold truncate max-w-[120px] text-sm">{hakoName}</span>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold shrink-0 ${isOwner ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
              {isOwner ? <ShieldAlert className="w-2.5 h-2.5" /> : <AtSign className="w-2.5 h-2.5" />}
              {isOwner ? 'Owner' : 'Member'}
            </div>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <InstallButton variant="icon" />
          </div>
        </header>

        {/* Page Content */}
        {children}
      </main>
    </div>
  )
}

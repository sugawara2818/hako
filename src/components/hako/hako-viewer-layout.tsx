'use client'

// v2.1.0 - Refined Chat Notification & Realtime System
import { getHakoGradient } from '@/lib/hako-utils'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Hash, LayoutDashboard, Settings, ShieldAlert, AtSign, BookOpen, Calendar, Image as ImageIcon, Users, MessageCircle, MessageSquare } from 'lucide-react'
import { InstallButton } from '@/components/hako/install-button'
import { UserMenu } from '@/components/hako/user-menu'
import { MobileSidebar } from '@/components/hako/mobile-sidebar'
import { ThemeToggle } from '@/components/hako/theme-toggle'
import Image from 'next/image'
import { getLatestTimestamps, getUnreadChatCount } from '@/core/hako/actions'
import { supabase } from '@/lib/supabase/client'

interface HakoViewerLayoutProps {
  hakoId: string
  hakoName: string
  iconUrl: string | null
  iconColor: string | null
  email: string
  isOwner: boolean
  memberCount: number
  displayName: string | null
  avatarUrl?: string | null
  features?: string[]
  userId: string
  children: React.ReactNode
}

import { usePathname, useSearchParams } from 'next/navigation'

const DRAWER_WIDTH = Math.min(320, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 320)
const OPEN_THRESHOLD = 0.4 // 40% of drawer must be visible to snap open
const DRAG_THRESHOLD = 10 // Px must move before considering it a meaningful drag

export function HakoViewerLayout({
  hakoId, hakoName, iconUrl, iconColor, email, isOwner, memberCount, displayName, avatarUrl, features = ['timeline'], userId, children
}: HakoViewerLayoutProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeChannelIdFromUrl = searchParams.get('c')
  const [isOpen, setIsOpen] = useState(false)
  // dragOffset: 0 = closed, 1 = fully open
  const [dragProgress, setDragProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  
  const [hasNewTimeline, setHasNewTimeline] = useState(false)
  const [hasNewDiary, setHasNewDiary] = useState(false)
  const [hasNewBbs, setHasNewBbs] = useState(false)
  const [unreadChatCount, setUnreadChatCount] = useState<number>(0)

  const isDiaryActive = pathname.includes(`/hako/${hakoId}/diary`)
  const isTimelineActive = pathname === `/hako/${hakoId}`
  const isChatActive = pathname.includes(`/hako/${hakoId}/chat`)
  const isBbsActive = pathname.includes(`/hako/${hakoId}/bbs`)

  const touchStartX = useRef<number | null>(null)
  const touchX = useRef<number>(0)

  const lastProgress = useRef(0)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const x = e.touches[0].clientX
    // Only start tracking if touching from left edge (open) or when sidebar is open (anywhere)
    if (x < 40 || isOpen) {
      touchStartX.current = x
      touchX.current = x
      setIsDragging(true)
      // Initialize lastProgress based on current state to prevent snap-jump on first move
      lastProgress.current = isOpen ? 1 : 0
    }
  }, [isOpen])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (touchStartX.current === null) return
    const x = e.touches[0].clientX
    const dx = x - touchStartX.current
    touchX.current = x

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

    const dx = touchX.current - touchStartX.current
    const isMeaningfulDrag = Math.abs(dx) > DRAG_THRESHOLD

    touchStartX.current = null
    setIsDragging(false)

    // Only snap to a NEW state if we actually dragged significantly
    if (isMeaningfulDrag) {
      if (lastProgress.current > OPEN_THRESHOLD) {
        setIsOpen(true)
        setDragProgress(1)
      } else {
        setIsOpen(false)
        setDragProgress(0)
      }
    } else {
      // If it was just a tap or minor movement, revert to current state
      setDragProgress(isOpen ? 1 : 0)
    }
  }, [isOpen])

  const handleTouchCancel = useCallback(() => {
    touchStartX.current = null
    setIsDragging(false)
    setDragProgress(isOpen ? 1 : 0)
  }, [isOpen])

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    document.addEventListener('touchcancel', handleTouchCancel, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
      document.removeEventListener('touchcancel', handleTouchCancel)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel])

  useEffect(() => {
    const checkNotifications = async () => {
      try {
        const { latestPost, latestPostUserId, latestDiary, latestDiaryUserId, latestChat, latestChatUserId, latestBbs, latestBbsUserId } = await getLatestTimestamps(hakoId)
        const lastTimeline = localStorage.getItem(`hako_${hakoId}_last_timeline`)
        const lastDiary = localStorage.getItem(`hako_${hakoId}_last_diary`)
        const lastBbs = localStorage.getItem(`hako_${hakoId}_last_bbs`)
        
        if (latestPost && latestPostUserId !== userId && (!lastTimeline || new Date(latestPost) > new Date(lastTimeline))) {
            if (!isTimelineActive) setHasNewTimeline(true)
        }
        if (latestDiary && latestDiaryUserId !== userId && (!lastDiary || new Date(latestDiary) > new Date(lastDiary))) {
            if (!isDiaryActive) setHasNewDiary(true)
        }
        if (latestBbs && latestBbsUserId !== userId && (!lastBbs || new Date(latestBbs) > new Date(lastBbs))) {
            if (!isBbsActive) setHasNewBbs(true)
        }
        
        const currentChatCount = await getUnreadChatCount(hakoId)
        setUnreadChatCount(currentChatCount)
      } catch (e) {
        console.error("Failed to check notifications:", e)
      }
    }
    checkNotifications()
    
    // Check every 5 minutes as a fallback
    const interval = setInterval(checkNotifications, 1000 * 60 * 5)

    // Realtime listeners for instant notifications
    const channel = supabase
      .channel(`global_notifications:${hakoId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `hako_id=eq.${hakoId}` }, (payload) => {
         // Skip notification if we are already viewing this specific channel
         if (payload.new.user_id !== userId && payload.new.channel_id !== activeChannelIdFromUrl) {
             setUnreadChatCount(prev => prev + 1)
         }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hako_timeline_posts', filter: `hako_id=eq.${hakoId}` }, checkNotifications)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'hako_diaries', filter: `hako_id=eq.${hakoId}` }, checkNotifications)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bbs_posts', filter: `hako_id=eq.${hakoId}` }, checkNotifications)
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [hakoId, isTimelineActive, isDiaryActive, isChatActive, userId])

  // Trigger re-check when switching channels to clear badge immediately
  useEffect(() => {
    const check = async () => {
       const count = await getUnreadChatCount(hakoId)
       setUnreadChatCount(count)
    }
    check()
  }, [activeChannelIdFromUrl, hakoId])

  useEffect(() => {
    // Determine if the current path is a "Main Hub"
    const timelinePath = `/hako/${hakoId}`
    const diaryPath = `/hako/${hakoId}/diary`
    const calendarPath = `/hako/${hakoId}/calendar`
    const galleryPath = `/hako/${hakoId}/gallery`

    const isTimelineHub = pathname === timelinePath
    const isDiaryHub = pathname === diaryPath
    const isCalendarHub = pathname === calendarPath
    const isGalleryHub = pathname === galleryPath
    const isBbsHub = pathname === `/hako/${hakoId}/bbs`

    if (isTimelineHub || isDiaryHub || isCalendarHub || isGalleryHub || isBbsHub) {
        localStorage.setItem(`hako_${hakoId}_last_hub`, pathname)
    }

    if (isTimelineActive) {
        localStorage.setItem(`hako_${hakoId}_last_timeline`, new Date().toISOString())
        setHasNewTimeline(false)
    }
    if (isDiaryActive) {
        localStorage.setItem(`hako_${hakoId}_last_diary`, new Date().toISOString())
        setHasNewDiary(false)
    }
    if (isBbsActive) {
        localStorage.setItem(`hako_${hakoId}_last_bbs`, new Date().toISOString())
        setHasNewBbs(false)
    }
    if (isChatActive) {
        // We no longer clear chat notifications just by being on the page.
        // Clearing is handled per-channel in ChatView.tsx via database updates.
    }
  }, [isTimelineActive, isDiaryActive, isChatActive, hakoId, pathname])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setDragProgress(0)
    lastProgress.current = 0
  }, [])

  // Computed values for animation
  const activeProgress = isDragging ? dragProgress : (isOpen ? 1 : 0)
  const drawerX = -(1 - activeProgress) * DRAWER_WIDTH
  const backdropOpacity = activeProgress * 0.6
  const backdropBlur = activeProgress * 4 // px
  const showBackdrop = activeProgress > 0.01

  const hakoGradient = getHakoGradient(iconColor)

  return (
    <div className="min-h-screen text-white flex font-sans overflow-hidden" style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}>
      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Desktop Sidebar */}
      <aside className="w-64 h-screen sticky top-0 flex flex-col z-10 hidden md:flex" style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
        <div className="h-16 flex items-center px-4 gap-2" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20 shrink-0 overflow-hidden ${!iconUrl ? `bg-gradient-to-br ${hakoGradient}` : ''}`}>
            {iconUrl ? (
              <Image 
                src={iconUrl} 
                alt="" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover"
                unoptimized={iconUrl.startsWith('data:')}
              />
            ) : hakoName.charAt(0).toUpperCase()}
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
            {features.map((featureId) => {
              if (featureId === 'timeline') {
                return (
                  <Link
                    key="timeline"
                    href={`/hako/${hakoId}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold relative ${isTimelineActive
                        ? 'theme-surface theme-text border theme-border shadow-sm'
                        : 'theme-muted hover:theme-text hover:theme-elevated border border-transparent'
                      }`}
                  >
                    <Hash className={`w-5 h-5 ${isTimelineActive ? 'text-indigo-400' : ''}`} />
                    タイムライン
                    {hasNewTimeline && (
                      <span className="absolute top-3.5 right-4 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    )}
                  </Link>
                )
              }
              if (featureId === 'diary') {
                return (
                  <Link
                    key="diary"
                    href={`/hako/${hakoId}/diary`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold relative ${isDiaryActive
                        ? 'theme-surface theme-text border theme-border shadow-sm'
                        : 'theme-muted hover:theme-text hover:theme-elevated border border-transparent'
                      }`}
                  >
                    <BookOpen className={`w-5 h-5 ${isDiaryActive ? 'text-blue-400' : ''}`} />
                    日記
                    {hasNewDiary && (
                      <span className="absolute top-3.5 right-4 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    )}
                  </Link>
                )
              }
              if (featureId === 'calendar') {
                return (
                  <Link
                    key="calendar"
                    href={`/hako/${hakoId}/calendar`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold relative ${pathname.includes(`/hako/${hakoId}/calendar`)
                        ? 'theme-surface theme-text border theme-border shadow-sm'
                        : 'theme-muted hover:theme-text hover:theme-elevated border border-transparent'
                      }`}
                  >
                    <Calendar className={`w-5 h-5 ${pathname.includes(`/hako/${hakoId}/calendar`) ? 'text-pink-400' : ''}`} />
                    カレンダー
                  </Link>
                )
              }
              if (featureId === 'gallery') {
                return (
                  <Link
                    key="gallery"
                    href={`/hako/${hakoId}/gallery`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold relative ${pathname.includes(`/hako/${hakoId}/gallery`)
                        ? 'theme-surface theme-text border theme-border shadow-sm'
                        : 'theme-muted hover:theme-text hover:theme-elevated border border-transparent'
                      }`}
                  >
                    <ImageIcon className={`w-5 h-5 ${pathname.includes(`/hako/${hakoId}/gallery`) ? 'text-emerald-400' : ''}`} />
                    ギャラリー
                  </Link>
                )
              }
              if (featureId === 'chat') {
                return (
                  <Link
                    key="chat"
                    href={`/hako/${hakoId}/chat`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold relative ${pathname.includes(`/hako/${hakoId}/chat`)
                        ? 'theme-surface theme-text border theme-border shadow-sm'
                        : 'theme-muted hover:theme-text hover:theme-elevated border border-transparent'
                      }`}
                  >
                    <MessageCircle className={`w-5 h-5 ${pathname.includes(`/hako/${hakoId}/chat`) ? 'text-teal-400' : ''}`} />
                    チャット
                    {unreadChatCount > 0 && (
                      <span className="absolute top-1/2 -translate-y-1/2 right-4 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-sm shadow-red-500/20">
                        {unreadChatCount > 99 ? '99+' : unreadChatCount}
                      </span>
                    )}
                  </Link>
                )
              }
              if (featureId === 'bbs') {
                return (
                  <Link
                    key="bbs"
                    href={`/hako/${hakoId}/bbs`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold relative ${pathname.includes(`/hako/${hakoId}/bbs`)
                        ? 'theme-surface theme-text border theme-border shadow-sm'
                        : 'theme-muted hover:theme-text hover:theme-elevated border border-transparent'
                      }`}
                  >
                    <MessageSquare className={`w-5 h-5 ${pathname.includes(`/hako/${hakoId}/bbs`) ? 'text-purple-400' : ''}`} />
                    掲示板
                    {hasNewBbs && (
                      <span className="absolute top-3.5 right-4 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                    )}
                  </Link>
                )
              }
              return null
            })}
          </div>

          <div className="pt-4 px-2">
            <InstallButton variant="sidebar" />
          </div>
        </nav>

        <div className="p-4 space-y-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
          <Link
            key="members"
            href={`/hako/${hakoId}/members`}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold relative ${pathname === `/hako/${hakoId}/members`
                ? 'theme-surface theme-text border theme-border shadow-sm'
                : 'theme-muted hover:theme-text hover:theme-elevated border border-transparent'
              }`}
          >
            <Users className={`w-5 h-5 ${pathname === `/hako/${hakoId}/members` ? 'text-orange-400' : ''}`} />
            メンバー
          </Link>

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

          <ThemeToggle />
          <UserMenu userId={userId} email={email} hakoId={hakoId} isOwner={isOwner} displayName={displayName} avatarUrl={avatarUrl} />
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
          onClick={e => e.stopPropagation()} // Stop propagation to backdrop
          style={{
            width: `${DRAWER_WIDTH}px`,
            transform: `translateX(${drawerX}px)`,
            transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
            willChange: 'transform',
          }}
        >
          <MobileSidebar
            userId={userId}
            hakoId={hakoId}
            hakoName={hakoName}
            iconUrl={iconUrl}
            iconColor={iconColor}
            email={email}
            isOwner={isOwner}
            memberCount={memberCount}
            displayName={displayName}
            avatarUrl={avatarUrl}
            features={features}
            isOpen={isOpen}
            onClose={handleClose}
            hasNewTimeline={hasNewTimeline}
            hasNewDiary={hasNewDiary}
            unreadChatCount={unreadChatCount}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen relative z-10 overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 flex items-center justify-between px-4 sticky top-0 z-50" style={{
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-surface)',
          backdropFilter: 'blur(12px)'
        }}>
          <button
            onClick={() => { setIsOpen(true); setDragProgress(1); lastProgress.current = 1 }}
            className="flex items-center gap-2 min-w-0 flex-1 h-full active:opacity-70 transition-opacity"
            style={{ willChange: 'transform, opacity' }}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20 shrink-0 overflow-hidden ${!iconUrl ? `bg-gradient-to-br ${hakoGradient}` : ''}`}>
              {iconUrl ? (
                <Image 
                  src={iconUrl} 
                  alt="" 
                  width={32} 
                  height={32} 
                  className="w-full h-full object-cover"
                  unoptimized={iconUrl.startsWith('data:')}
                />
              ) : hakoName.charAt(0).toUpperCase()}
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

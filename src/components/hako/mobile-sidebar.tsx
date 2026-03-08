'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Hash, LayoutDashboard, Settings, Download, User, UserMinus, X } from 'lucide-react'
import { InstallButton } from '@/components/hako/install-button'
import { leaveHako } from '@/core/hako/actions'
import { useRouter } from 'next/navigation'

interface MobileSidebarProps {
  hakoId: string
  hakoName: string
  email: string
  isOwner: boolean
  memberCount: number
  isOpen: boolean
  onClose: () => void
}

export function MobileSidebar({
  hakoId, hakoName, email, isOwner, memberCount, isOpen, onClose
}: MobileSidebarProps) {
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)

  // Close on swipe left
  useEffect(() => {
    const el = drawerRef.current
    if (!el) return

    const onTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
    }
    const onTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current === null) return
      const dx = e.changedTouches[0].clientX - touchStartX.current
      if (dx < -60) onClose()  // swipe left to close
      touchStartX.current = null
    }
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [onClose])

  const handleLeaveHako = async () => {
    if (confirm('この箱から退会しますか？（参加し直すには招待リンクが必要です）')) {
      try {
        await leaveHako(hakoId)
        router.push('/')
      } catch (e) {
        alert('退会処理に失敗しました')
      }
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[150] md:hidden">
      {/* Blurred backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Sidebar drawer */}
      <div
        ref={drawerRef}
        className="absolute left-0 top-0 h-full w-[80vw] max-w-[320px] bg-[#0a0a0a] border-r border-white/5 flex flex-col animate-in slide-in-from-left duration-200 shadow-2xl"
      >
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20">H</div>
            <span className="font-bold truncate max-w-[160px] text-sm">{hakoName}</span>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">メニュー</p>
            <Link href={`/hako/${hakoId}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 text-white font-bold border border-white/5">
              <Hash className="w-5 h-5 text-purple-400" />
              タイムライン
            </Link>
          </div>

          {isOwner && (
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-black text-blue-500/50 uppercase tracking-widest mb-2">管理ツール</p>
              <Link href="/owner/dashboard" onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 transition-all font-bold">
                <LayoutDashboard className="w-5 h-5" /> 一覧へ戻る
              </Link>
              <Link href={`/owner/hako/${hakoId}`} onClick={onClose} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-purple-400/70 hover:text-purple-400 hover:bg-purple-500/10 transition-all font-bold">
                <Settings className="w-5 h-5" /> 箱の設定
              </Link>
            </div>
          )}

          <div className="pt-4 px-2">
            <InstallButton variant="sidebar" />
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-white/5 bg-black/40">
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 mb-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center shrink-0">
              <User className="w-5 h-5 text-gray-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{email.split('@')[0]}</p>
              <p className="text-xs text-gray-500 truncate">{email}</p>
            </div>
          </div>

          {!isOwner && (
            <button
              onClick={handleLeaveHako}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium text-left"
            >
              <UserMinus className="w-4 h-4" />
              この箱から退会する
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

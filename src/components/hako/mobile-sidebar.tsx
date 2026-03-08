'use client'

import { useRef, useEffect } from 'react'
import Link from 'next/link'
import { Hash, LayoutDashboard, Settings, User, UserMinus, X } from 'lucide-react'
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
  hakoId, hakoName, email, isOwner, memberCount, onClose
}: MobileSidebarProps) {
  const router = useRouter()

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

  return (
    <div className="w-full h-full bg-[#0a0a0a] border-r border-white/5 flex flex-col shadow-2xl">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20 shrink-0">H</div>
          <span className="font-bold truncate text-sm">{hakoName}</span>
        </div>
        <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-colors shrink-0">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
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
      <div className="p-4 border-t border-white/5 bg-black/40 shrink-0">
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
  )
}

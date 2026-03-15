'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Hash, LayoutDashboard, Settings, UserMinus, X, BookOpen, Calendar, Image as ImageIcon, Users } from 'lucide-react'
import { InstallButton } from '@/components/hako/install-button'
import { UsernameEditor } from '@/components/hako/username-editor'
import { leaveHako } from '@/core/hako/actions'
import { usePathname, useRouter } from 'next/navigation'
import { getHakoGradient } from '@/lib/hako-utils'
import { LeaveHakoModal } from '@/components/hako/leave-hako-modal'
import { UserAvatarUpload } from '@/components/hako/user-avatar-upload'
import { ThemeToggle } from '@/components/hako/theme-toggle'
import Image from 'next/image'

interface MobileSidebarProps {
  userId: string
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
  isOpen: boolean
  onClose: () => void
  hasNewTimeline?: boolean
  hasNewDiary?: boolean
}

export function MobileSidebar({
  userId, hakoId, hakoName, iconUrl, iconColor, email, isOwner, memberCount, displayName, avatarUrl, features = ['timeline'], isOpen, onClose, hasNewTimeline, hasNewDiary
}: MobileSidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const isDiaryActive = pathname.includes(`/hako/${hakoId}/diary`)
  const isTimelineActive = pathname === `/hako/${hakoId}`

  const shownName = displayName || email.split('@')[0]

  const [showLeaveModal, setShowLeaveModal] = useState(false)

  const handleLeaveHako = async () => {
    try {
      await leaveHako(hakoId)
      router.push('/')
    } catch (e) {
      alert('退会処理に失敗しました')
      console.error(e)
    }
  }

  return (
    <div className="w-full h-full flex flex-col shadow-2xl" style={{ backgroundColor: 'var(--bg-surface)', borderRight: '1px solid var(--border)' }}>
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20 shrink-0 overflow-hidden ${!iconUrl ? `bg-gradient-to-br ${getHakoGradient(iconColor)}` : ''}`}>
            {iconUrl ? (
              <Image 
                src={iconUrl} 
                alt="" 
                width={32} 
                height={32} 
                className="w-full h-full object-cover" 
              />
            ) : hakoName.charAt(0).toUpperCase()}
          </div>
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
          {features.map((featureId) => {
            if (featureId === 'timeline') {
              return (
                <Link 
                  key="timeline"
                  href={`/hako/${hakoId}`} 
                  onClick={onClose} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold border relative ${
                    isTimelineActive 
                      ? 'bg-white/10 text-white border-white/5' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <Hash className={`w-5 h-5 ${isTimelineActive ? 'text-purple-400' : ''}`} />
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
                  onClick={onClose} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold border relative ${
                    isDiaryActive 
                      ? 'bg-white/10 text-white border-white/5' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
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
                  onClick={onClose} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold border relative ${
                    pathname.includes(`/hako/${hakoId}/calendar`)
                      ? 'bg-white/10 text-white border-white/5' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
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
                  onClick={onClose} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold border relative ${
                    pathname.includes(`/hako/${hakoId}/gallery`)
                      ? 'bg-white/10 text-white border-white/5' 
                      : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                  }`}
                >
                  <ImageIcon className={`w-5 h-5 ${pathname.includes(`/hako/${hakoId}/gallery`) ? 'text-emerald-400' : ''}`} />
                  ギャラリー
                </Link>
              )
            }
            return null
          })}
          
          <Link 
            key="members"
            href={`/hako/${hakoId}/members`} 
            onClick={onClose} 
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all font-bold border relative ${
              pathname === `/hako/${hakoId}/members`
                ? 'bg-white/10 text-white border-white/5' 
                : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
            }`}
          >
            <Users className={`w-5 h-5 ${pathname === `/hako/${hakoId}/members` ? 'text-orange-400' : ''}`} />
            メンバー
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
      <div className="p-4 shrink-0 space-y-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)' }}>
        <ThemeToggle />
        <Link 
          href={`/hako/${hakoId}/user/${userId}`}
          onClick={onClose}
          className="flex items-center gap-3 p-3 rounded-2xl mb-3 theme-elevated border theme-border hover:theme-surface transition-all group"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border theme-border">
            {avatarUrl ? (
              <Image 
                src={avatarUrl} 
                alt="" 
                width={40} 
                height={40} 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-gray-400">
                <X className="w-5 h-5 opacity-20" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold theme-text truncate">{shownName}</p>
            <p className="text-xs theme-muted truncate mt-0.5">{email}</p>
          </div>
        </Link>

        {!isOwner && (
          <button
            onClick={() => setShowLeaveModal(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-500/10 transition-colors text-sm font-medium text-left"
          >
            <UserMinus className="w-4 h-4" />
            この箱から退会する
          </button>
        )}
      </div>

      <LeaveHakoModal 
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveHako}
      />
    </div>
  )
}

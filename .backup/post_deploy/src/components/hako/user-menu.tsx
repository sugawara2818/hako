'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, UserMinus } from 'lucide-react'
import { leaveHako } from '@/core/hako/actions'
import { useRouter } from 'next/navigation'
import { UsernameEditor } from '@/components/hako/username-editor'
import { LeaveHakoModal } from '@/components/hako/leave-hako-modal'
import { UserAvatarUpload } from '@/components/hako/user-avatar-upload'
import Image from 'next/image'
interface UserMenuProps {
  userId: string
  email: string
  hakoId: string
  isOwner: boolean
  displayName: string | null
  avatarUrl?: string | null
}

import Link from 'next/link'

export function UserMenu({ userId, email, hakoId, isOwner, displayName, avatarUrl }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLeaveHako = async () => {
    try {
      await leaveHako(hakoId)
      router.push('/')
    } catch (error) {
      alert('退会処理に失敗しました')
      console.error(error)
    }
  }

  const shownName = displayName || email.split('@')[0]

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center gap-1">
        <Link 
          href={`/hako/${hakoId}/user/${userId}`}
          className="flex-1 flex items-center gap-3 p-3 rounded-2xl hover:theme-elevated transition-all group min-w-0"
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
                <UserMinus className="w-5 h-5 opacity-20" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 text-left hidden md:block">
            <p className="text-sm font-bold theme-text truncate">{shownName}</p>
            <p className="text-xs theme-muted truncate">{email}</p>
          </div>
        </Link>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-3 theme-muted hover:theme-text hover:bg-white/10 rounded-xl md:block hidden"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-48 glass rounded-2xl border theme-border bg-black/90 shadow-2xl overflow-hidden py-1 animate-in fade-in slide-in-from-bottom-2 duration-200 z-[100]">
          {!isOwner ? (
            <button
              onClick={() => {
                setIsOpen(false)
                setShowLeaveModal(true)
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <UserMinus className="w-4 h-4" />
              この箱から退会する
            </button>
          ) : (
            <div className="px-4 py-3 text-xs theme-muted">
              オーナーは退会できません
            </div>
          )}
        </div>
      )}

      <LeaveHakoModal 
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveHako}
      />
    </div>
  )
}


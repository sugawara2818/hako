'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, UserMinus, User } from 'lucide-react'
import { leaveHako } from '@/core/hako/actions'
import { useRouter } from 'next/navigation'
import { UsernameEditor } from '@/components/hako/username-editor'
import { LeaveHakoModal } from '@/components/hako/leave-hako-modal'

interface UserMenuProps {
  email: string
  hakoId: string
  isOwner: boolean
  displayName: string | null
}

export function UserMenu({ email, hakoId, isOwner, displayName }: UserMenuProps) {
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
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-white/10 transition-all group"
      >
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center shrink-0 group-hover:border-purple-500/50 transition-colors">
          <User className="w-5 h-5 text-gray-400 group-hover:text-purple-400" />
        </div>
        <div className="flex-1 min-w-0 text-left hidden md:block">
          <p className="text-sm font-bold text-white truncate">{shownName}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
        <MoreHorizontal className="w-5 h-5 text-gray-500 hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 glass rounded-[24px] border border-white/10 bg-black/90 shadow-2xl overflow-hidden py-2 animate-in fade-in slide-in-from-bottom-2 duration-200 z-[100]">
          <div className="px-4 py-3 border-b border-white/5 mb-1 space-y-1">
            <UsernameEditor hakoId={hakoId} currentName={shownName} />
            <p className="text-xs text-gray-500 truncate">{email}</p>
          </div>

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
            <div className="px-4 py-3 text-xs text-gray-600">
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


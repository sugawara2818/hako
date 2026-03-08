'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { AlertCircle, Loader2 } from 'lucide-react'

interface LeaveHakoModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function LeaveHakoModal({ isOpen, onClose, onConfirm }: LeaveHakoModalProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!isOpen || !mounted) return null

  const handleConfirm = async () => {
    setIsDeleting(true)
    try {
      await onConfirm()
    } finally {
      setIsDeleting(false)
      onClose()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="glass-card w-full max-w-sm p-6 rounded-3xl border border-red-500/20 shadow-2xl shadow-red-900/20 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4 text-red-400">
          <AlertCircle className="w-6 h-6 shrink-0" />
          <h3 className="text-lg font-bold">退会の確認</h3>
        </div>
        
        <p className="text-gray-300 text-sm mb-6 leading-relaxed">
          本当にこの箱から退会しますか？<br/>
          <span className="text-gray-500 text-xs mt-2 block">※再び参加するには新しい招待リンクが必要になります。</span>
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-sm transition-colors disabled:opacity-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 font-bold text-sm transition-colors border border-red-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isDeleting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> 処理中</>
            ) : (
              '退会する'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

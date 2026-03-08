'use client'

import { useState, useRef, useEffect } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateDisplayName } from '@/core/hako/actions'
import { useRouter } from 'next/navigation'

interface UsernameEditorProps {
  hakoId: string
  currentName: string
}

export function UsernameEditor({ hakoId, currentName }: UsernameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Scroll input into view when keyboard appears on mobile
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Small delay to let keyboard fully open
      setTimeout(() => {
        inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        inputRef.current?.focus()
      }, 150)
    }
  }, [isEditing])

  const handleSave = async () => {
    if (!value.trim()) return
    setLoading(true)
    try {
      await updateDisplayName(hakoId, value.trim())
      setIsEditing(false)
      router.refresh()
    } catch (e) {
      alert('名前の更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setValue(currentName)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 w-full animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
            enterKeyHint="done"
            className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 text-base md:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 focus:bg-white/15 transition-colors shadow-inner"
            placeholder="表示名（最大30文字）"
            maxLength={30}
            disabled={loading}
          />
        </div>
        <div className="flex items-center justify-end gap-2">
           <button
            onClick={handleCancel}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-all active:scale-95 flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-xs font-bold bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded-xl transition-all active:scale-95 flex items-center gap-1 border border-purple-500/20"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            保存
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center justify-between group w-full text-left p-1 -m-1 rounded-lg hover:bg-white/5 transition-colors"
    >
      <span className="text-sm font-bold text-white truncate pr-2 group-hover:text-purple-300 transition-colors uppercase tracking-tight">{currentName}</span>
      <Pencil className="w-3.5 h-3.5 text-gray-600 group-hover:text-purple-400 transition-colors shrink-0" />
    </button>
  )
}

// Add Loader2 import if missing
import { Loader2 } from 'lucide-react'

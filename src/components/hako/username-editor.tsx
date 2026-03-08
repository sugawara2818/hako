'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { updateDisplayName } from '@/core/hako/actions'
import { useRouter } from 'next/navigation'

interface UsernameEditorProps {
  hakoId: string
  currentName: string  // current display name or fallback
}

export function UsernameEditor({ hakoId, currentName }: UsernameEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel() }}
          className="flex-1 min-w-0 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 focus:bg-white/15 transition-colors"
          placeholder="ユーザー名"
          maxLength={30}
          autoFocus
          disabled={loading}
        />
        <button
          onClick={handleSave}
          disabled={loading}
          className="p-1.5 text-green-400 hover:bg-green-500/10 rounded-lg transition-colors shrink-0"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="p-1.5 text-gray-500 hover:bg-white/10 rounded-lg transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="flex items-center gap-2 group w-full text-left"
    >
      <span className="text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">{currentName}</span>
      <Pencil className="w-3 h-3 text-gray-600 group-hover:text-purple-400 transition-colors shrink-0" />
    </button>
  )
}

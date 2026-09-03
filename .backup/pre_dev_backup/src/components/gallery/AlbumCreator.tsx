'use client'

import { useState } from 'react'
import { X, FolderPlus, Loader2 } from 'lucide-react'
import { createAlbum } from '@/core/gallery/actions'

interface AlbumCreatorProps {
  hakoId: string
  onClose: () => void
  onSuccess: () => void
}

export function AlbumCreator({ hakoId, onClose, onSuccess }: AlbumCreatorProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    
    try {
      const result = await createAlbum(hakoId, name, description)
      if (result.success) {
        onSuccess()
      } else {
        setError(result.error || 'アルバムの作成に失敗しました')
      }
    } catch (err) {
      setError('予期せぬエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111] border border-white/10 rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl">
              <FolderPlus className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="font-black text-xl text-white">新しいアルバム</h3>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">アルバム名</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="思い出の名前を入力..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest pl-1">説明 (任意)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="このアルバムについて..."
              className="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500/50 transition-colors resize-none h-24"
            />
          </div>

          {error && <p className="text-red-400 text-xs font-bold pl-1">{error}</p>}

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-black shadow-xl shadow-purple-900/40 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <FolderPlus className="w-5 h-5" />}
            アルバムを作成
          </button>
        </form>
      </div>
    </div>
  )
}

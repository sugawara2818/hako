'use client'

import { useState } from 'react'
import { Plus, Hash, X, Loader2, Trash2 } from 'lucide-react'

interface Channel {
  id: string
  name: string
  description: string | null
}

interface ChannelSidebarProps {
  channels: Channel[]
  activeChannelId: string
  onChannelSelect: (id: string) => void
  onCreateChannel: (name: string, description: string) => Promise<void>
  onDeleteChannel: (id: string) => Promise<void>
  isOwner: boolean
}

export function ChannelSidebar({ 
  channels, 
  activeChannelId, 
  onChannelSelect, 
  onCreateChannel,
  onDeleteChannel,
  isOwner
}: ChannelSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onCreateChannel(newName, newDesc)
      setNewName('')
      setNewDesc('')
      setShowCreateModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-64 border-r theme-border h-full flex flex-col theme-surface">
      <div className="p-6 border-b theme-border flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-widest theme-muted">チャンネル</h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {channels.map((ch) => (
          <div key={ch.id} className="group flex items-center gap-1">
            <button
              onClick={() => onChannelSelect(ch.id)}
              className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeChannelId === ch.id 
                  ? 'bg-brand-primary/10 text-brand-primary' 
                  : 'theme-text hover:bg-white/5 opacity-70 hover:opacity-100'
              }`}
            >
              <Hash className={`w-4 h-4 ${activeChannelId === ch.id ? 'text-brand-primary' : 'theme-muted'}`} />
              <span className="truncate">{ch.name}</span>
            </button>
            {isOwner && channels.length > 1 && (
              <button
                onClick={() => onDeleteChannel(ch.id)}
                className="w-8 h-8 rounded-lg text-red-500/50 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm glass-card p-8 rounded-3xl theme-border space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">新しいチャンネル</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="theme-muted hover:theme-text transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">チャンネル名</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: 雑談部屋"
                  className="w-full theme-elevated border theme-border rounded-xl px-4 py-3 text-sm theme-text focus:outline-none focus:border-brand-primary/50"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">説明（任意）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="このチャンネルの目的など"
                  rows={2}
                  className="w-full theme-elevated border theme-border rounded-xl px-4 py-3 text-sm theme-text focus:outline-none focus:border-brand-primary/50 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={!newName.trim() || isSubmitting}
                className="w-full py-4 bg-brand-primary text-gray-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'チャンネルを作成'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

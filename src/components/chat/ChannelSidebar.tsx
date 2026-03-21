'use client'

import { useState, useMemo } from 'react'
import { Plus, Hash, X, Loader2, Trash2, Users, Search, Check } from 'lucide-react'

interface Channel {
  id: string
  name: string
  description: string | null
  type?: 'public' | 'private'
  last_message_content?: string | null
  last_message_at?: string | null
  unreadCount?: number
}

interface Member {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

interface ChannelSidebarProps {
  channels: Channel[]
  members: Member[]
  activeChannelId: string
  onChannelSelect: (id: string) => void
  onCreateChannel: (name: string, description: string, type: 'public' | 'private', memberIds: string[]) => Promise<void>
  onDeleteChannel: (id: string) => Promise<void>
  isOwner: boolean
}

export function ChannelSidebar({ 
  channels, 
  members,
  activeChannelId, 
  onChannelSelect, 
  onCreateChannel,
  onDeleteChannel,
  isOwner
}: ChannelSidebarProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [channelType, setChannelType] = useState<'public' | 'private'>('public')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])
  const [memberSearch, setMemberSearch] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members
    return members.filter(m => 
      (m.display_name || '').toLowerCase().includes(memberSearch.toLowerCase())
    )
  }, [members, memberSearch])

  const toggleMember = (userId: string) => {
    setSelectedMemberIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onCreateChannel(newName, newDesc, channelType, selectedMemberIds)
      setNewName('')
      setNewDesc('')
      setChannelType('public')
      setSelectedMemberIds([])
      setShowCreateModal(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full h-full flex flex-col theme-surface">
      <div className="p-6 border-b theme-border flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-widest theme-muted">チャット</h2>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-6 h-6 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center hover:bg-brand-primary/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-2 space-y-0.5 custom-scrollbar">
        {channels.map((ch) => {
          const lastTime = ch.last_message_at 
            ? new Date(ch.last_message_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
            : ''
          
          return (
            <div key={ch.id} className="group relative">
              <button
                onClick={() => onChannelSelect(ch.id)}
                className={`w-full flex items-start gap-3 px-4 py-3 transition-all ${
                  activeChannelId === ch.id 
                    ? 'bg-brand-primary/10' 
                    : 'hover:bg-white/5 opacity-90 hover:opacity-100'
                }`}
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full overflow-hidden bg-brand-primary/20 shrink-0 border theme-border flex items-center justify-center text-brand-primary font-black text-lg shadow-sm">
                  {ch.name.charAt(0).toUpperCase()}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5 text-left pt-0.5">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className={`text-[15px] font-bold truncate ${activeChannelId === ch.id ? 'text-brand-primary' : 'theme-text'}`}>
                      {ch.name}
                    </span>
                    <span className="text-[10px] theme-muted font-medium shrink-0">
                      {lastTime}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center gap-2 h-5">
                    <p className="text-xs theme-muted truncate font-medium">
                      {ch.last_message_content || (ch.description || 'まだメッセージはありません')}
                    </p>
                    {ch.unreadCount && ch.unreadCount > 0 ? (
                      <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#06C755] text-white text-[10px] font-black flex items-center justify-center shadow-sm shrink-0">
                        {ch.unreadCount > 99 ? '99+' : ch.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>

              {isOwner && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteChannel(ch.id)
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg text-red-500/0 group-hover:text-red-500/50 hover:text-red-500 hover:bg-red-500/10 flex items-center justify-center transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm glass-card p-8 rounded-3xl theme-border space-y-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">新しいチャット</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="theme-muted hover:theme-text transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="flex p-1 bg-white/5 rounded-xl border theme-border">
                <button
                  type="button"
                  onClick={() => setChannelType('public')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${channelType === 'public' ? 'bg-brand-primary text-gray-900' : 'theme-muted hover:theme-text'}`}
                >
                  パブリック
                </button>
                <button
                  type="button"
                  onClick={() => setChannelType('private')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${channelType === 'private' ? 'bg-brand-primary text-gray-900' : 'theme-muted hover:theme-text'}`}
                >
                  非公開（メンバー指定）
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">名前</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: グループA"
                  className="w-full theme-elevated border theme-border rounded-xl px-4 py-3 text-sm theme-text focus:outline-none focus:border-brand-primary/50"
                  required
                />
              </div>

              {channelType === 'private' && (
                <div className="space-y-2">
                  <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">メンバーを追加</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-muted" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="メンバーを検索..."
                      className="w-full theme-elevated border theme-border rounded-xl pl-10 pr-4 py-2 text-sm theme-text focus:outline-none focus:border-brand-primary/50"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {filteredMembers.map(member => (
                      <button
                        key={member.user_id}
                        type="button"
                        onClick={() => toggleMember(member.user_id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${selectedMemberIds.includes(member.user_id) ? 'bg-brand-primary/10 text-brand-primary' : 'hover:bg-white/5 theme-text'}`}
                      >
                        <span className="truncate">{member.display_name || 'ユーザー'}</span>
                        {selectedMemberIds.includes(member.user_id) && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">説明（任意）</label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={2}
                  className="w-full theme-elevated border theme-border rounded-xl px-4 py-3 text-sm theme-text focus:outline-none focus:border-brand-primary/50 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!newName.trim() || isSubmitting}
                className="w-full py-4 bg-brand-primary text-gray-800 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '作成する'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

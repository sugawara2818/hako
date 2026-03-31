'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Loader2, Trash2, X, Users } from 'lucide-react'
import { getBbsThreads, createBbsThread, deleteBbsThread, type BbsThread } from '@/core/bbs/actions'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { BBSThreadDetail } from './BBSThreadDetail'

interface BBSViewProps {
  hakoId: string
  isOwner: boolean
  defaultDisplayName: string | null
}

export function BBSView({ hakoId, isOwner, defaultDisplayName }: BBSViewProps) {
  const [threads, setThreads] = useState<BbsThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [userName, setUserName] = useState(defaultDisplayName || '名無しさん')

  // スレッド一覧の取得
  useEffect(() => {
    const fetchThreads = async () => {
      try {
        setIsLoading(true)
        const data = await getBbsThreads(hakoId)
        setThreads(data)
      } catch (err) {
        console.error('Failed to fetch threads:', err)
      } finally {
        setIsLoading(false)
      }
    }
    if (!activeThreadId) {
      fetchThreads()
    }
  }, [hakoId, activeThreadId])

  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim() || isPosting) return
    
    setIsPosting(true)
    try {
      const thread = await createBbsThread(hakoId, newTitle, newContent, userName)
      setNewTitle('')
      setNewContent('')
      setShowCreateModal(false)
      setActiveThreadId(thread.id)
    } finally {
      setIsPosting(false)
    }
  }

  const handleDeleteThread = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('スレッドを削除しますか？')) return
    await deleteBbsThread(id)
    setThreads(prev => prev.filter(t => t.id !== id))
  }

  // スレッド詳細が表示されている場合
  if (activeThreadId) {
    return (
      <BBSThreadDetail
        key={activeThreadId}
        hakoId={hakoId}
        threadId={activeThreadId}
        isOwner={isOwner}
        defaultDisplayName={defaultDisplayName}
        onBack={() => setActiveThreadId(null)}
      />
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full theme-bg overflow-hidden relative">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-6 md:px-8 shrink-0">
        <h1 className="text-2xl md:text-3xl font-black theme-text tracking-tighter">掲示板</h1>
      </div>

      {/* Thread List */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {isLoading && threads.length === 0 ? (
          <div className="flex items-center justify-center h-full py-20">
            <Loader2 className="w-8 h-8 animate-spin theme-muted" />
          </div>
        ) : threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-40 text-center">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <MessageSquare className="w-8 h-8" />
            </div>
            <p className="text-sm font-bold">まだスレッドがありません。最初の話題を作成しましょう！</p>
          </div>
        ) : (
          <div className="grid gap-3 max-w-4xl mx-auto">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className="group w-full theme-surface theme-text border theme-border rounded-2xl p-4 flex items-center gap-4 hover:theme-elevated transition-all text-left shadow-sm"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${thread.is_pinned ? 'bg-amber-500/20 text-amber-500' : 'bg-purple-500/10 text-purple-400'}`}>
                   {thread.is_pinned ? <Plus className="w-6 h-6 rotate-45" /> : <MessageSquare className="w-6 h-6" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold truncate text-[15px]">{thread.title}</h3>
                    <span className="text-[10px] theme-muted whitespace-nowrap">
                      {formatDistanceToNow(new Date(thread.last_post_at), { addSuffix: true, locale: ja })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] theme-muted font-medium">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {thread.post_count} レス
                    </span>
                    <span>開設: {format(new Date(thread.created_at), 'yyyy/MM/dd')}</span>
                  </div>
                </div>
                {isOwner && (
                  <button onClick={(e) => handleDeleteThread(thread.id, e)} className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* FAB (Floating Action Button) */}
      {!activeThreadId && (
        <button 
          onClick={() => setShowCreateModal(true)}
          className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 md:w-16 md:h-16 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-2xl shadow-purple-600/40 hover:scale-110 active:scale-90 transition-all z-40"
          title="スレッドを立てる"
        >
          <Plus className="w-8 h-8 stroke-[3]" />
        </button>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md glass-card p-8 rounded-3xl theme-border space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">新しいスレッドを立てる</h2>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="theme-muted hover:theme-text"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateThread} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">タイトル</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="例: おすすめのご飯について語ろう"
                  className="w-full theme-elevated border theme-border rounded-xl px-4 py-3 text-sm theme-text focus:outline-none focus:border-brand-primary/50"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">内容</label>
                <textarea
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  rows={4}
                  className="w-full theme-elevated border theme-border rounded-xl px-4 py-3 text-sm theme-text focus:outline-none focus:border-brand-primary/50 resize-none"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black theme-muted uppercase tracking-widest px-1">名前 (任意)</label>
                <input
                  type="text"
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  className="w-full theme-elevated border theme-border rounded-xl px-4 py-3 text-sm theme-text focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={!newTitle.trim() || !newContent.trim() || isPosting}
                className="w-full py-4 bg-purple-500 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'スレッドを立てる'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

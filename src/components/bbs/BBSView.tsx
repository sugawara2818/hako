'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, MessageSquare, ChevronLeft, Send, Hash, Users, Loader2, Trash2, X } from 'lucide-react'
import { getBbsThreads, getBbsThread, createBbsThread, createBbsPost, deleteBbsThread, deleteBbsPost, type BbsThread, type BbsPost } from '@/core/bbs/actions'
import { formatDistanceToNow, format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface BBSViewProps {
  hakoId: string
  isOwner: boolean
  defaultDisplayName: string | null
}

export function BBSView({ hakoId, isOwner, defaultDisplayName }: BBSViewProps) {
  const [threads, setThreads] = useState<BbsThread[]>([])
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<{ thread: BbsThread, posts: BbsPost[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [replyContent, setReplyContent] = useState('')
  const [userName, setUserName] = useState(defaultDisplayName || '名無しさん')

  const postsEndRef = useRef<HTMLDivElement>(null)

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

  // 特定スレッドの取得
  useEffect(() => {
    const fetchThreadDetail = async () => {
      if (!activeThreadId) return
      try {
        setIsLoading(true)
        const data = await getBbsThread(activeThreadId)
        setActiveThread(data)
      } catch (err) {
        console.error('Failed to fetch thread detail:', err)
        setActiveThreadId(null)
      } finally {
        setIsLoading(false)
      }
    }
    fetchThreadDetail()
  }, [activeThreadId])

  useEffect(() => {
    if (activeThread) {
      postsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeThread])

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

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || isPosting || !activeThreadId) return
    
    setIsPosting(true)
    try {
      await createBbsPost(activeThreadId, replyContent, userName)
      setReplyContent('')
      // 自動更新のために再取得
      const data = await getBbsThread(activeThreadId)
      setActiveThread(data)
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

  const handleDeletePost = async (id: string) => {
    if (!confirm('投稿を削除しますか？')) return
    await deleteBbsPost(id)
    if (activeThreadId) {
      const data = await getBbsThread(activeThreadId)
      setActiveThread(data)
    }
  }

  if (activeThreadId && activeThread) {
    return (
      <div className="flex-1 flex flex-col h-full theme-bg overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="h-14 border-b theme-border flex items-center px-4 md:px-6 bg-white/5 backdrop-blur-md justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <button 
              onClick={() => setActiveThreadId(null)}
              className="p-2 -ml-2 theme-muted hover:theme-text transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-bold truncate text-sm md:text-base pr-4 border-r theme-border">{activeThread.thread.title}</h2>
            <span className="text-xs theme-muted shrink-0 hidden sm:inline">{activeThread.thread.post_count} レス</span>
          </div>
        </div>

        {/* Posts Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {activeThread.posts.map((post) => (
            <div key={post.id} className="space-y-2 max-w-4xl mx-auto">
              <div className="flex items-center justify-between text-[11px] font-bold">
                <div className="flex items-center gap-2">
                  <span className="text-brand-primary">{post.post_number} :</span>
                  <span className="theme-text">{post.user_name || '名無しさん'}</span>
                  <span className="theme-muted">
                    {format(new Date(post.created_at), 'yyyy/MM/dd(E) HH:mm:ss', { locale: ja })}
                  </span>
                </div>
                {isOwner && (
                  <button onClick={() => handleDeletePost(post.id)} className="text-red-500/50 hover:text-red-500 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-sm theme-text leading-relaxed whitespace-pre-wrap break-all pl-2 border-l-2 theme-border py-1">
                {post.content}
              </p>
            </div>
          ))}
          <div ref={postsEndRef} className="h-20" />
        </div>

        {/* Reply Form */}
        <div className="p-4 border-t theme-border bg-white/5 backdrop-blur-md">
          <form onSubmit={handlePostReply} className="max-w-4xl mx-auto space-y-3">
             <div className="flex gap-2">
               <input 
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="名前 (省略可)"
                className="flex-1 max-w-[200px] text-xs theme-elevated border theme-border rounded-xl px-4 py-2 theme-text focus:outline-none"
               />
               <div className="flex-1" />
             </div>
             <div className="flex gap-2">
               <textarea 
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                placeholder="メッセージを入力..."
                className="flex-1 theme-elevated border theme-border rounded-2xl px-4 py-3 text-sm theme-text focus:outline-none focus:border-brand-primary/50 resize-none min-h-[60px]"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handlePostReply(e)
                  }
                }}
               />
               <button 
                type="submit"
                disabled={!replyContent.trim() || isPosting}
                className="w-12 h-12 rounded-2xl bg-brand-primary text-white flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all self-end shrink-0 disabled:opacity-50"
               >
                 {isPosting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
               </button>
             </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full theme-bg overflow-hidden">
      {/* Header */}
      <div className="h-24 flex items-center justify-between px-6 md:px-8 shrink-0">
        <h1 className="text-3xl md:text-4xl font-black theme-text tracking-tighter">掲示板</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-purple-600 text-white font-bold shadow-xl shadow-purple-600/20 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[3]" />
          <span className="hidden sm:inline">スレッドを立てる</span>
        </button>
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

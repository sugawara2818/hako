'use client'

import { useState, useEffect, useRef } from 'react'
import { ChevronLeft, Send, Loader2, Trash2 } from 'lucide-react'
import { getBbsThread, createBbsPost, deleteBbsPost, type BbsThread, type BbsPost } from '@/core/bbs/actions'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface BBSThreadDetailProps {
  hakoId: string
  threadId: string
  isOwner: boolean
  defaultDisplayName: string | null
  onBack: () => void
}

export function BBSThreadDetail({ hakoId, threadId, isOwner, defaultDisplayName, onBack }: BBSThreadDetailProps) {
  const [data, setData] = useState<{ thread: BbsThread, posts: BbsPost[] } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPosting, setIsPosting] = useState(false)
  const [replyContent, setReplyContent] = useState('')
  const [userName, setUserName] = useState(defaultDisplayName || '名無しさん')

  const postsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchThreadDetail = async () => {
      try {
        setIsLoading(true)
        const res = await getBbsThread(threadId)
        setData(res)
      } catch (err) {
        console.error('Failed to fetch thread detail:', err)
        onBack()
      } finally {
        setIsLoading(false)
      }
    }
    fetchThreadDetail()
  }, [threadId, onBack])

  useEffect(() => {
    if (data) {
      postsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [data])

  const handlePostReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!replyContent.trim() || isPosting) return
    
    setIsPosting(true)
    try {
      await createBbsPost(threadId, replyContent, userName)
      setReplyContent('')
      const res = await getBbsThread(threadId)
      setData(res)
    } finally {
      setIsPosting(false)
    }
  }

  const handleDeletePost = async (id: string) => {
    if (!confirm('投稿を削除しますか？')) return
    await deleteBbsPost(id)
    const res = await getBbsThread(threadId)
    setData(res)
  }

  if (isLoading || !data) {
    return (
      <div className="flex-1 flex flex-col h-full theme-bg items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin theme-muted" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full theme-bg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="h-14 border-b theme-border flex items-center px-4 md:px-6 bg-white/5 backdrop-blur-md justify-between shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <button 
            onClick={onBack}
            className="p-2 -ml-2 theme-muted hover:theme-text transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold truncate text-sm md:text-base pr-4 border-r theme-border">{data.thread.title}</h2>
          <span className="text-xs theme-muted shrink-0 hidden sm:inline">{data.thread.post_count} レス</span>
        </div>
      </div>

      {/* Posts Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        {data.posts.map((post) => (
          <div key={post.id} id={`post-${post.post_number}`} className="space-y-2 max-w-4xl mx-auto group/post">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    if (!replyContent.includes(`>>${post.post_number}`)) {
                      setReplyContent(prev => `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}>>${post.post_number}\n`)
                    }
                  }}
                  className="text-brand-primary hover:underline cursor-pointer"
                >
                  {post.post_number} :
                </button>
                <span className="theme-text">{post.user_name || '名無しさん'}</span>
                <span className="theme-muted">
                  {format(new Date(post.created_at), 'yyyy/MM/dd(E) HH:mm:ss', { locale: ja })}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover/post:opacity-100 transition-opacity">
                 <button 
                  onClick={() => {
                    if (!replyContent.includes(`>>${post.post_number}`)) {
                      setReplyContent(prev => `${prev}${prev && !prev.endsWith('\n') ? '\n' : ''}>>${post.post_number}\n`)
                    }
                  }}
                  className="theme-muted hover:theme-text text-[10px]"
                 >
                   返信
                 </button>
                 {isOwner && (
                  <button onClick={() => handleDeletePost(post.id)} className="text-red-500/50 hover:text-red-500 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
            <div className="text-sm theme-text leading-relaxed whitespace-pre-wrap break-all pl-2 border-l-2 theme-border py-1">
              {post.content.split(/(\>\>[0-9]+)/g).map((part, i) => {
                if (part.match(/^\>\>[0-9]+$/)) {
                  const num = part.replace('>>', '')
                  return (
                    <span 
                      key={i} 
                      className="text-brand-primary font-bold cursor-pointer hover:underline"
                      onClick={() => {
                        const target = document.getElementById(`post-${num}`)
                        target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                        target?.classList.add('bg-brand-primary/10')
                        setTimeout(() => target?.classList.remove('bg-brand-primary/10'), 2000)
                      }}
                    >
                      {part}
                    </span>
                  )
                }
                return part
              })}
            </div>
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

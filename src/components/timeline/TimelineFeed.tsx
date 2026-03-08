'use client'

import { useState } from 'react'
import { createTimelinePost } from '@/core/timeline/actions'
import { TimelinePost } from './TimelinePost'
import { Send, Image as ImageIcon, Loader2 } from 'lucide-react'

interface TimelineFeedProps {
  hakoId: string
  currentUserId: string
  initialPosts: any[]
}

export function TimelineFeed({ hakoId, currentUserId, initialPosts }: TimelineFeedProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    
    try {
      await createTimelinePost(hakoId, content)
      setContent('') // clear input on success
      // Next.js will revalidate the page and show the new post
    } catch (err: any) {
      console.error(err)
      setError('投稿に失敗しました。もう一度お試しください。')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Create Post Input Box */}
      <div className="glass p-6 rounded-3xl border border-white/10 shadow-xl shadow-black/20">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="この箱のメンバーに共有しよう"
            className="w-full bg-transparent text-white placeholder-gray-500 text-lg resize-none outline-none min-h-[80px]"
            disabled={isSubmitting}
            maxLength={1000}
          />
          
          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <button 
                type="button" 
                className="p-2 text-purple-400 hover:bg-purple-500/10 rounded-full transition-colors"
                title="画像を追加 (準備中)"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!content.trim() || isSubmitting}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full font-bold shadow-lg shadow-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              投稿する
            </button>
          </div>
        </form>
      </div>

      {/* Feed List */}
      <div className="flex flex-col gap-4">
        {initialPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400 glass rounded-3xl border border-white/5">
            <p>まだ投稿がありません。最初の投稿をしましょう！</p>
          </div>
        ) : (
          initialPosts.map(post => (
            <TimelinePost 
              key={post.id} 
              post={post} 
              currentUserId={currentUserId} 
            />
          ))
        )}
      </div>
    </div>
  )
}

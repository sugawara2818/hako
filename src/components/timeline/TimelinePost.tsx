'use client'

import { useState, useTransition } from 'react'
import { Heart, MessageCircle, Repeat2, Bookmark, Trash2, MoreHorizontal, Loader2 } from 'lucide-react'
import { toggleLike, deleteTimelinePost, deleteTimelineComment, addTimelineComment } from '@/core/timeline/actions'

interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
}

interface Comment {
  id: string
  content: string
  created_at: string
  user_id: string
  profiles: Profile
}

interface PostProps {
  post: {
    id: string
    hako_id: string
    user_id: string
    content: string
    image_url: string | null
    created_at: string
    likes_count: number
    is_liked: boolean
    profiles: Profile
    comments: Comment[]
  }
  currentUserId: string
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr)
  const diff = (Date.now() - date.getTime()) / 1000
  if (diff < 60) return "たった今"
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}日前`
  return date.toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })
}

export function TimelinePost({ post, currentUserId }: PostProps) {
  const [isPending, startTransition] = useTransition()
  
  // Optimistic UI state based on server props
  const [optimisticState, setOptimisticState] = useState<{ isLiked: boolean, likesCount: number } | null>(null)
  
  const isLiked = optimisticState ? optimisticState.isLiked : post.is_liked
  const likesCount = optimisticState ? optimisticState.likesCount : post.likes_count

  // Whenever the server prop changes, clear our optimistic overrides
  const serverStateSignature = `${post.is_liked}-${post.likes_count}`
  const [lastServerState, setLastServerState] = useState(serverStateSignature)
  if (serverStateSignature !== lastServerState) {
    setLastServerState(serverStateSignature)
    setOptimisticState(null)
  }
  
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleLike = () => {
    // Optimistic update
    const newIsLiked = !isLiked
    const newCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1)
    
    setOptimisticState({ isLiked: newIsLiked, likesCount: newCount })
    
    startTransition(async () => {
      try {
        await toggleLike(post.id, post.hako_id)
      } catch (e) {
        // Revert on failure
        setOptimisticState(null)
        console.error("Like failed", e)
      }
    })
  }

  const handleDelete = async () => {
    if (!confirm('この投稿を削除してよろしいですか？')) return
    setIsDeleting(true)
    try {
      await deleteTimelinePost(post.id, post.hako_id)
    } catch (e) {
      console.error("Delete failed", e)
      setIsDeleting(false)
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() || isSubmittingComment) return
    
    setIsSubmittingComment(true)
    try {
      await addTimelineComment(post.id, post.hako_id, commentText)
      setCommentText('')
    } catch (e) {
      console.error("Comment failed", e)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('コメントを削除しますか？')) return
    try {
      await deleteTimelineComment(commentId, post.id, post.hako_id)
    } catch (e) {
      console.error("Comment delete failed", e)
    }
  }

  if (isDeleting) {
    return (
      <div className="glass p-6 rounded-2xl border border-white/5 flex items-center justify-center min-h-[150px] animate-pulse">
        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
      </div>
    )
  }

  return (
    <div className="glass p-6 rounded-2xl border border-white/5 transition-all hover:bg-white/[0.02]">
      {/* Header */}
      <div className="flex items-start gap-3">
        {post.profiles?.avatar_url ? (
          <img src={post.profiles.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 flex items-center justify-center shrink-0 font-bold border border-white/5">
            {post.profiles?.display_name?.charAt(0) || '?'}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white text-sm">{post.profiles?.display_name}</span>
            <span className="text-gray-500 text-xs text-mono">@{post.user_id?.split('-')[0]}</span>
            <span className="text-gray-500 text-xs">· {formatRelativeTime(post.created_at)}</span>
          </div>
          
          <div className="mt-2 text-gray-200 text-sm md:text-base leading-relaxed whitespace-pre-line">
            {post.content}
          </div>

          {post.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-white/10">
              <img src={post.image_url} alt="Post Attachment" className="w-full object-cover max-h-96" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-6 mt-4 text-gray-500 text-sm select-none">
            <button 
              onClick={handleLike}
              disabled={isPending}
              className={`flex items-center gap-1.5 transition-colors group ${isLiked ? 'text-pink-500' : 'hover:text-pink-400'}`}
            >
              <Heart className={`w-[18px] h-[18px] transition-transform group-active:scale-95 ${isLiked ? 'fill-current' : ''}`} />
              <span>{likesCount}</span>
            </button>

            <button className="flex items-center gap-1.5 hover:text-green-400 transition-colors group">
              <Repeat2 className="w-[18px] h-[18px] transition-transform group-active:scale-95" />
            </button>

            <button 
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-1.5 hover:text-blue-400 transition-colors group ${showComments ? 'text-blue-400' : ''}`}
            >
              <MessageCircle className={`w-[18px] h-[18px] transition-transform group-active:scale-95 ${showComments ? 'fill-current/20' : ''}`} />
              <span>{post.comments?.length || 0}</span>
            </button>

            <button className="flex items-center gap-1.5 hover:text-purple-400 transition-colors group line-through opacity-50 cursor-not-allowed">
              <Bookmark className="w-[18px] h-[18px]" />
            </button>

            <div className="flex-1" />

            {currentUserId === post.user_id && (
              <button onClick={handleDelete} className="hover:text-red-400 transition-colors">
                <Trash2 className="w-[18px] h-[18px]" />
              </button>
            )}
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
              <form onSubmit={handleAddComment} className="flex gap-3 mb-6">
                <input 
                  type="text" 
                  placeholder="返信をポスト" 
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded-full px-4 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                  disabled={isSubmittingComment}
                />
                <button 
                  type="submit"
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-semibold disabled:opacity-50 transition-colors shrink-0"
                >
                  返信
                </button>
              </form>

              <div className="space-y-4">
                {post.comments?.length === 0 && (
                  <p className="text-gray-500 text-xs text-center py-2">まだコメントはありません</p>
                )}
                {post.comments?.map(comment => (
                  <div key={comment.id} className="flex gap-3 group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold border border-white/5 text-xs">
                       {comment.profiles?.display_name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0 bg-white/5 rounded-2xl rounded-tl-none p-3 relative">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-white text-xs">{comment.profiles?.display_name}</span>
                           <span className="text-gray-500 text-[10px]">{formatRelativeTime(comment.created_at)}</span>
                        </div>
                        {currentUserId === comment.user_id && (
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

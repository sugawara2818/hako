'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Heart, MessageCircle, Repeat2, Bookmark, Trash2, Loader2, AlertTriangle, X, User, Image as ImageIcon } from 'lucide-react'
import { toggleLike, deleteTimelinePost, deleteTimelineComment, addTimelineComment, updateTimelineComment } from '@/core/timeline/actions'
import { toggleGalleryPin } from '@/core/gallery/actions'
import { Edit2 } from 'lucide-react'
import { ImageLightbox } from './ImageLightbox'
import Image from 'next/image'

// ──────────────────────────────────────────────────
// Custom confirm dialog component
// ──────────────────────────────────────────────────
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = '削除する',
  danger = true,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <div className="absolute inset-x-0 inset-y-0 z-[50] flex items-center justify-center p-4">
      {/* Backdrop for the card only */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-2xl" onClick={onCancel} />
      {/* Dialog card */}
      <div className="relative w-full max-w-[280px] bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-sm text-gray-200 leading-relaxed mb-4 text-center">{message}</p>
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`w-full py-2 rounded-xl text-sm font-bold transition-colors ${
              danger
                ? 'bg-red-500 text-white hover:bg-red-600'
                : 'bg-purple-600 text-white hover:bg-purple-500'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-2 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-medium transition-colors"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}

// ──────────────────────────────────────────────────

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
    image_urls?: string[]
    is_gallery?: boolean
    created_at: string
    likes_count: number
    is_liked: boolean
    profiles: Profile
    comments: Comment[]
    hako_members?: {
      display_name: string | null
    }[]
  }
  currentUserId: string
  isFullWidth?: boolean
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

export function TimelinePost({ post, currentUserId, isFullWidth = false }: PostProps) {
  const [isPending, startTransition] = useTransition()
  
  // Images to display
  const images = post.image_urls || (post.image_url ? [post.image_url] : [])

  // Optimistic like state
  const [optimisticState, setOptimisticState] = useState<{ isLiked: boolean, likesCount: number } | null>(null)
  const isLiked = optimisticState ? optimisticState.isLiked : post.is_liked
  const likesCount = optimisticState ? optimisticState.likesCount : post.likes_count

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
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState('')
  const [isUpdatingComment, setIsUpdatingComment] = useState(false)

  // Custom confirm dialog state
  const [confirmState, setConfirmState] = useState<{
    message: string
    onConfirm: () => void
  } | null>(null)

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmState({ message, onConfirm })
  }

  const handleLike = () => {
    const newIsLiked = !isLiked
    const newCount = newIsLiked ? likesCount + 1 : Math.max(0, likesCount - 1)
    setOptimisticState({ isLiked: newIsLiked, likesCount: newCount })
    startTransition(async () => {
      try {
        await toggleLike(post.id, post.hako_id)
      } catch (e) {
        setOptimisticState(null)
        console.error("Like failed", e)
      }
    })
  }

  const handleDelete = () => {
    showConfirm('投稿を削除しますか？', async () => {
      setConfirmState(null)
      setIsDeleting(true)
      try {
        await deleteTimelinePost(post.id, post.hako_id)
      } catch (e) {
        console.error("Delete failed", e)
        setIsDeleting(false)
      }
    })
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

  const handleDeleteComment = (commentId: string) => {
    showConfirm('コメントを削除しますか？', async () => {
      setConfirmState(null)
      try {
        await deleteTimelineComment(commentId, post.id, post.hako_id)
      } catch (e) {
        console.error("Comment delete failed", e)
      }
    })
  }

  const handleUpdateComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCommentId || !editCommentText.trim() || isUpdatingComment) return
    setIsUpdatingComment(true)
    try {
      await updateTimelineComment(editingCommentId, post.hako_id, editCommentText)
      setEditingCommentId(null)
      setEditCommentText('')
    } catch (e) {
      console.error("Comment update failed", e)
    } finally {
      setIsUpdatingComment(false)
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
    <div className="relative group/post">
      {/* Custom Confirm Dialog - Contextual overlay */}
      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}

      <div 
        className={`${isFullWidth ? 'p-0 border-0' : 'py-4 px-3 sm:py-6 sm:px-6 md:py-8 md:px-8 border-b'} transition-colors`}
        style={{ borderBottomColor: isFullWidth ? 'transparent' : 'var(--border)' }}
        onMouseEnter={e => {
          if (!isFullWidth) e.currentTarget.style.backgroundColor = 'var(--bg-elevated)';
        }}
        onMouseLeave={e => {
          if (!isFullWidth) e.currentTarget.style.backgroundColor = '';
        }}        
      >
        {/* Header */}
        <div className="flex items-start gap-4">
          <Link href={`/hako/${post.hako_id}/user/${post.user_id}`} className="shrink-0 group/avatar">
            {post.profiles?.avatar_url ? (
              <Image 
                src={post.profiles.avatar_url} 
                alt="avatar" 
                width={44} 
                height={44} 
                className="w-10 h-10 md:w-11 md:h-11 rounded-full object-cover transition-transform group-hover/avatar:scale-105 border theme-border" 
              />
            ) : (
              <div className="w-10 h-10 md:w-11 md:h-11 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 flex items-center justify-center font-bold border theme-border transition-transform group-hover/avatar:scale-105">
                {post.profiles?.display_name?.charAt(0) || '?'}
              </div>
            )}
          </Link>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={`/hako/${post.hako_id}/user/${post.user_id}`} className="font-bold text-white text-sm hover:underline truncate max-w-[120px] sm:max-w-none">
                {post.hako_members?.[0]?.display_name || post.profiles?.display_name || 'ユーザー'}
              </Link>
              <span className="text-gray-500 text-[10px] md:text-xs">· {formatRelativeTime(post.created_at)}</span>
            </div>
            
            {/* Content with Gallery styling */}
            <div className="mt-2 space-y-3">
              {post.content && (
                <div className="text-gray-200 leading-relaxed whitespace-pre-line text-sm md:text-base">
                  {post.content}
                </div>
              )}
            </div>

            {/* X-style Adaptive Image Grid */}
            {images.length > 0 && (
              <div className="mt-3 overflow-hidden rounded-2xl border border-white/10">
                {images.length === 1 && (
                  <button type="button" onClick={() => setSelectedImageIndex(0)} className="relative aspect-auto max-h-[512px] w-full text-left cursor-pointer" style={{ backgroundColor: 'var(--bg-elevated)' }}>
                    <Image 
                      src={images[0]} 
                      alt="Attachment" 
                      width={800} 
                      height={600} 
                      className="w-full h-full object-contain" 
                      priority={false}
                    />
                  </button>
                )}
                {images.length === 2 && (
                  <div className="grid grid-cols-2 gap-0.5 aspect-[16/9]" style={{ backgroundColor: 'var(--border)' }}>
                    <button type="button" onClick={() => setSelectedImageIndex(0)} className="relative h-full cursor-pointer">
                      <Image src={images[0]} alt="" fill className="object-cover" />
                    </button>
                    <button type="button" onClick={() => setSelectedImageIndex(1)} className="relative h-full cursor-pointer">
                      <Image src={images[1]} alt="" fill className="object-cover" />
                    </button>
                  </div>
                )}
                {images.length === 3 && (
                  <div className="grid grid-cols-2 gap-0.5 aspect-[16/9]" style={{ backgroundColor: 'var(--border)' }}>
                    <button type="button" onClick={() => setSelectedImageIndex(0)} className="relative h-full cursor-pointer">
                      <Image src={images[0]} alt="" fill className="object-cover" />
                    </button>
                    <div className="grid grid-rows-2 gap-0.5 h-full">
                      <button type="button" onClick={() => setSelectedImageIndex(1)} className="relative h-full cursor-pointer">
                        <Image src={images[1]} alt="" fill className="object-cover" />
                      </button>
                      <button type="button" onClick={() => setSelectedImageIndex(2)} className="relative h-full cursor-pointer">
                        <Image src={images[2]} alt="" fill className="object-cover" />
                      </button>
                    </div>
                  </div>
                )}
                {images.length >= 4 && (
                  <div className="grid grid-cols-2 grid-rows-2 gap-0.5 aspect-[16/9]" style={{ backgroundColor: 'var(--border)' }}>
                    <button type="button" onClick={() => setSelectedImageIndex(0)} className="relative h-full cursor-pointer"><Image src={images[0]} alt="" fill className="object-cover" /></button>
                    <button type="button" onClick={() => setSelectedImageIndex(1)} className="relative h-full cursor-pointer"><Image src={images[1]} alt="" fill className="object-cover" /></button>
                    <button type="button" onClick={() => setSelectedImageIndex(2)} className="relative h-full cursor-pointer"><Image src={images[2]} alt="" fill className="object-cover" /></button>
                    <button type="button" onClick={() => setSelectedImageIndex(3)} className="relative h-full cursor-pointer"><Image src={images[3]} alt="" fill className="object-cover" /></button>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-6 mt-4 text-gray-500 text-sm select-none">
              <button 
                onClick={handleLike}
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
                  <textarea 
                    placeholder="返信をポスト" 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    className="flex-1 bg-black/50 border border-white/10 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-purple-500 transition-colors resize-none overflow-hidden"
                    disabled={isSubmittingComment}
                    rows={1}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = target.scrollHeight + 'px';
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleAddComment(e as any);
                      }
                    }}
                  />
                  <button 
                    type="submit"
                    disabled={!commentText.trim() || isSubmittingComment}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-full text-sm font-semibold disabled:opacity-50 transition-colors shrink-0"
                  >
                    返信
                  </button>
                </form>

                {/* Content */}
                <div className="space-y-4">
                  {post.content && (
                    <p className={`text-sm leading-relaxed theme-text whitespace-pre-wrap ${post.is_gallery ? 'text-lg font-medium' : ''}`}>
                      {post.content}
                    </p>
                  )}
                  {post.comments?.length === 0 && (
                    <p className="text-gray-500 text-xs text-center py-2">まだコメントはありません</p>
                  )}
                  {post.comments?.map(comment => (
                    <div key={comment.id} className="relative flex gap-3 group/comment">
                      <Link href={`/hako/${post.hako_id}/user/${comment.user_id}`} className="shrink-0 hover:opacity-80 transition-opacity">
                        {comment.profiles?.avatar_url ? (
                          <Image src={comment.profiles.avatar_url} alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center shrink-0 font-bold border border-white/5 text-xs">
                             {comment.profiles?.display_name?.charAt(0) || '?'}
                          </div>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0 bg-white/5 rounded-2xl rounded-tl-none p-3 pb-4">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                             <Link href={`/hako/${post.hako_id}/user/${comment.user_id}`} className="font-bold text-white text-xs hover:underline truncate max-w-[100px] sm:max-w-none">
                                {comment.profiles?.display_name}
                             </Link>
                             <span className="text-gray-500 text-[10px]">{formatRelativeTime(comment.created_at)}</span>
                          </div>
                          {currentUserId === comment.user_id && !editingCommentId && (
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  setEditingCommentId(comment.id)
                                  setEditCommentText(comment.content)
                                }}
                                className="text-gray-500 hover:text-blue-400 md:opacity-0 md:group-hover/comment:opacity-100 transition-opacity"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-gray-500 hover:text-red-400 md:opacity-0 md:group-hover/comment:opacity-100 transition-opacity"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {editingCommentId === comment.id ? (
                          <form onSubmit={handleUpdateComment} className="mt-2">
                            <textarea
                              value={editCommentText}
                              onChange={e => setEditCommentText(e.target.value)}
                              className="w-full bg-black/50 border border-purple-500/50 rounded-xl p-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500 mb-2 resize-none"
                              rows={2}
                              autoFocus
                            />
                            <div className="flex justify-end gap-2">
                              <button 
                                type="button" 
                                onClick={() => setEditingCommentId(null)}
                                className="px-3 py-1 text-[10px] font-bold text-gray-400 hover:text-white transition-colors"
                              >
                                キャンセル
                              </button>
                              <button 
                                type="submit"
                                disabled={!editCommentText.trim() || isUpdatingComment}
                                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-[10px] font-bold disabled:opacity-50 transition-colors"
                              >
                                {isUpdatingComment ? '保存中...' : '保存'}
                              </button>
                            </div>
                          </form>
                        ) : (
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{comment.content}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Lightbox / Fullscreen Image Viewer Modal */}
      {selectedImageIndex !== null && (
        <ImageLightbox images={images} initialIndex={selectedImageIndex} onClose={() => setSelectedImageIndex(null)} />
      )}
    </div>
  )
}

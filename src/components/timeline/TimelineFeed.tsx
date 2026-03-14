'use client'

import { useState, useRef, useEffect, useTransition, useCallback } from 'react'
import { createTimelinePost } from '@/core/timeline/actions'
import { uploadPostImage } from '@/core/timeline/upload'
import { TimelinePost } from './TimelinePost'
import Image from 'next/image' // Added this import
import { Send, Image as ImageIcon, Loader2, X, ArrowDown, Plus, Trash2, Heart, MessageCircle, MoreVertical, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TimelineFeedProps {
  hakoId: string
  currentUserId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialPosts: any[]
  hideHeader?: boolean
  isFullWidth?: boolean
}

export function TimelineFeed({ hakoId, currentUserId, initialPosts, hideHeader = false, isFullWidth = false }: TimelineFeedProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [content, setContent] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  
  type Draft = { id: string; content: string; date: number }
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [viewingDrafts, setViewingDrafts] = useState(false)
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addToGallery, setAddToGallery] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pull to refresh state
  const [startY, setStartY] = useState(0)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  const MAX_CHARS = 1000
  const PULL_THRESHOLD = 50 // Decreased for easier triggering
  const DAMPING = 0.6 // Increased for more direct feel

  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    
    startTransition(() => {
      router.refresh()
    })

    setTimeout(() => {
      setIsRefreshing(false)
    }, 600)
  }, [isRefreshing, router])

  useEffect(() => {
    const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
      if (!node) return null
      if (node.scrollHeight > node.clientHeight && 
          (getComputedStyle(node).overflowY === 'auto' || getComputedStyle(node).overflowY === 'scroll')) {
        return node
      }
      return getScrollParent(node.parentElement)
    }

    const onStart = (pageY: number) => {
      const scrollParent = getScrollParent(feedRef.current)
      const scrollTop = scrollParent ? scrollParent.scrollTop : window.scrollY
      if (scrollTop <= 0) {
        setStartY(pageY)
      }
    }

    const onMove = (pageY: number, e: TouchEvent | MouseEvent) => {
      if (startY === 0) return
      const diff = pageY - startY
      if (diff > 0) {
        const dist = Math.min(diff * DAMPING, PULL_THRESHOLD + 20)
        setPullDistance(dist)
        // Only prevent default if we've actually started pulling to avoid blocking normal taps
        if (dist > 5 && e.cancelable) {
          e.preventDefault()
        }
      }
    }

    const onEnd = () => {
      if (pullDistance >= PULL_THRESHOLD) {
        handleRefresh()
      }
      setStartY(0)
      setPullDistance(0)
    }

    // Touch Handlers
    const handleTouchStart = (e: TouchEvent) => onStart(e.touches[0].pageY)
    const handleTouchMove = (e: TouchEvent) => onMove(e.touches[0].pageY, e)
    const handleTouchEnd = () => onEnd()

    // Mouse Handlers
    const handleMouseDown = (e: MouseEvent) => onStart(e.pageY)
    const handleMouseMove = (e: MouseEvent) => onMove(e.pageY, e)
    const handleMouseUp = () => onEnd()

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [startY, pullDistance, isRefreshing, handleRefresh])

  // Draft Management
  useEffect(() => {
    const saved = localStorage.getItem(`hako_timeline_drafts_${hakoId}`)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setDrafts(parsed)
      } catch (e) {}
    }
  }, [hakoId])

  useEffect(() => {
    setHasDraft(drafts.length > 0)
  }, [drafts])

  const saveDraft = () => {
    if (!content.trim()) return
    const newDraft = { id: editingDraftId || Date.now().toString(), content, date: Date.now() }
    const newDrafts = [newDraft, ...drafts.filter(d => d.id !== newDraft.id)]
    
    setDrafts(newDrafts)
    localStorage.setItem(`hako_timeline_drafts_${hakoId}`, JSON.stringify(newDrafts))
    
    setContent('')
    setEditingDraftId(null)
    setPreviews([])
    setSelectedFiles([])
    setIsComposerOpen(false)
  }

  const deleteDraft = (id: string) => {
    const newDrafts = drafts.filter(d => d.id !== id)
    setDrafts(newDrafts)
    localStorage.setItem(`hako_timeline_drafts_${hakoId}`, JSON.stringify(newDrafts))
  }

  const loadDraft = (draft: Draft) => {
    setContent(draft.content)
    setEditingDraftId(draft.id)
    setViewingDrafts(false)
  }

  const handleModalClose = () => {
    if (isSubmitting) return
    if (content.trim()) {
      saveDraft()
    } else {
      setIsComposerOpen(false)
      setViewingDrafts(false)
      setEditingDraftId(null)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const remainingSlots = 4 - selectedFiles.length
    const limitedFiles = files.slice(0, remainingSlots)

    const newFiles = [...selectedFiles]
    const newPreviews = [...previews]

    for (const file of limitedFiles) {
      if (file.size > 10 * 1024 * 1024) {
        setError('各画像は10MB以下にしてください')
        continue
      }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    setSelectedFiles(newFiles)
    setPreviews(newPreviews)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removeImage = (index: number) => {
    const newFiles = [...selectedFiles]
    const newPreviews = [...previews]
    
    URL.revokeObjectURL(newPreviews[index])
    newFiles.splice(index, 1)
    newPreviews.splice(index, 1)
    
    setSelectedFiles(newFiles)
    setPreviews(newPreviews)
  }

  const clearAll = () => {
    previews.forEach(url => URL.revokeObjectURL(url))
    setSelectedFiles([])
    setPreviews([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    setContent('')
    if (editingDraftId) {
       deleteDraft(editingDraftId)
       setEditingDraftId(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && selectedFiles.length === 0) || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    
    try {
      const imageUrls: string[] = []

      if (selectedFiles.length > 0) {
        setIsUploadingImage(true)
        for (const file of selectedFiles) {
          const formData = new FormData()
          formData.append('file', file)
          const uploadResult = await uploadPostImage(formData)
          
          if (!uploadResult.success) {
            throw new Error(uploadResult.error || '画像のアップロードに失敗しました')
          }
          if (uploadResult.url) imageUrls.push(uploadResult.url)
        }
        setIsUploadingImage(false)
      }

      const postResult = await createTimelinePost(hakoId, content, imageUrls, { is_gallery: addToGallery })
      
      if (!postResult.success) {
        setError(postResult.error || '投稿の保存に失敗しました')
        return
      }

      clearAll()
      setIsComposerOpen(false)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Submit Error:', err)
      setError(err.message || '予期せぬエラーが発生しました。時間を置いて再度お試しください。')
      setIsUploadingImage(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const charCount = content.length
  const charPercentage = Math.min((charCount / MAX_CHARS) * 100, 100)
  const isNearLimit = charCount >= MAX_CHARS * 0.9
  const isOverLimit = charCount > MAX_CHARS

  const canSubmit = (content.trim() || selectedFiles.length > 0) && !isSubmitting && !isOverLimit

  return (
    <>
    <div 
      ref={feedRef}
      className="w-full max-w-4xl mx-auto flex flex-col min-h-screen relative animate-fade-in"
      style={{ 
        animationDelay: '0.1s',
        backgroundColor: 'var(--bg)',
        borderLeft: '1px solid var(--border)',
        borderRight: '1px solid var(--border)'
      }}
    >
      {/* Timeline Header Integrated */}

      {/* Pull down indicator */}
      <div 
        className="overflow-hidden transition-all duration-200 flex items-center justify-center text-purple-400"
        style={{ height: pullDistance > 0 ? `${pullDistance}px` : (isRefreshing ? '50px' : '0px') }}
      >
        {isRefreshing ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <ArrowDown 
            className="w-6 h-6 transition-transform" 
            style={{ transform: `rotate(${pullDistance >= PULL_THRESHOLD ? '180deg' : '0deg'})` }} 
          />
        )}
      </div>

      <div className="flex flex-col">
        {initialPosts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p>まだ投稿がありません。最初の投稿をしましょう！</p>
          </div>
        ) : (
          <div className={`${isFullWidth ? 'w-full' : 'max-w-4xl px-0 md:px-8 pb-8 md:pb-12'} mx-auto w-full space-y-3 md:space-y-4`}>
            {initialPosts.map((post: any) => (
              <TimelinePost 
                key={post.id} 
                post={post} 
                currentUserId={currentUserId}
                isFullWidth={isFullWidth}
              />
            ))}
          </div>
        )}
      </div>
    </div>

    {/* Floating Action Button */}
    <button
      onClick={() => setIsComposerOpen(true)}
      className="fixed bottom-24 md:bottom-6 right-4 md:right-8 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/50 transition-all hover:scale-105 active:scale-95 z-40 group"
    >
      <Plus className="w-6 h-6" />
      {hasDraft && !isComposerOpen && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-yellow-400 border-2 border-[#050505] rounded-full"></span>
      )}
    </button>

    {/* Composer Modal */}
    {isComposerOpen && (
      <div className="fixed inset-0 z-[200] flex items-start md:items-center justify-center p-4 pt-20 md:pt-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleModalClose} />
        <div className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-white">ポストする</h3>
              {!viewingDrafts && drafts.length > 0 && (
                <button type="button" onClick={() => setViewingDrafts(true)} className="text-xs px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 hover:bg-yellow-500/30 transition-colors font-bold">
                  下書き ({drafts.length})
                </button>
              )}
            </div>
            <button type="button" onClick={handleModalClose} className="p-2 -mr-2 text-gray-400 hover:text-white rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {viewingDrafts ? (
            <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto hide-scrollbar">
              <div className="flex items-center gap-2 mb-2">
                 <button type="button" onClick={() => setViewingDrafts(false)} className="text-gray-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
                    ← 戻る
                 </button>
                 <span className="text-gray-500 text-sm">|</span>
                 <span className="text-white text-sm font-bold">下書き一覧</span>
              </div>
              {drafts.length === 0 && <p className="text-gray-500 text-center py-8">下書きはありません</p>}
              {drafts.map(draft => (
                 <div key={draft.id} className="bg-white/5 p-4 rounded-2xl border border-white/10 flex flex-col gap-2">
                     <p className="text-gray-300 text-sm line-clamp-3 whitespace-pre-wrap">{draft.content}</p>
                     <div className="flex items-center justify-between mt-2">
                         <span className="text-gray-500 text-xs">{new Date(draft.date).toLocaleString()}</span>
                         <div className="flex gap-2">
                             <button type="button" onClick={() => deleteDraft(draft.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors bg-black/30 rounded-full"><Trash2 className="w-4 h-4"/></button>
                             <button type="button" onClick={() => loadDraft(draft)} className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-bold transition-colors">編集する</button>
                         </div>
                     </div>
                 </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="いまどうしてる？"
                className="w-full bg-transparent text-white placeholder-gray-500 text-lg resize-none outline-none min-h-[120px] select-text"
                disabled={isSubmitting}
              />

              {/* Previews Grid */}
              {previews.length > 0 && (
                <div className={`flex flex-wrap gap-2 rounded-2xl overflow-hidden border border-white/10 relative`}>
                  {previews.map((url, i) => (
                    <div key={i} className="relative group/img w-20 h-20 rounded-xl overflow-hidden border border-white/10 shrink-0">
                    <Image 
                      src={url} 
                      alt="" 
                      width={80} 
                      height={80} 
                      className="w-full h-full object-cover" 
                      unoptimized={url.startsWith('blob:') || url.startsWith('data:')}
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover/img:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  ))}
                  {isUploadingImage && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center backdrop-blur-sm z-20">
                      <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-2" />
                      <p className="text-white text-sm font-medium">アップロード中...</p>
                    </div>
                  )}
                </div>
              )}

              {error && <p className="text-red-400 text-sm">{error}</p>}
              
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isSubmitting || selectedFiles.length >= 4}
                  />
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || selectedFiles.length >= 4}
                    className={`p-2 rounded-full transition-colors ${
                      selectedFiles.length >= 4
                        ? 'text-gray-600 cursor-not-allowed'
                        : 'text-purple-400 hover:bg-purple-500/10 active:scale-95'
                    }`}
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-4">
                  {/* Gallery Switch UI */}
                  {selectedFiles.length > 0 && (
                    <div className="flex items-center gap-3 py-1 px-3 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-400">
                        共有ギャラリーに追加
                      </span>
                      <button
                        type="button"
                        onClick={() => setAddToGallery(!addToGallery)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                          addToGallery ? 'bg-[#82d9bc]' : 'bg-gray-700'
                        }`}
                      >
                        <div
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${
                            addToGallery ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  )}

                  {/* Character Count Circle */}
                  {charCount > 0 && (
                    <div className="flex items-center gap-2">
                       <div className="relative w-7 h-7">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle
                            cx="14"
                            cy="14"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="transparent"
                            className="text-white/10"
                          />
                          <circle
                            cx="14"
                            cy="14"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="transparent"
                            strokeDasharray={62.8}
                            strokeDashoffset={62.8 - (62.8 * charPercentage) / 100}
                            className={`transition-all duration-300 ${
                              isOverLimit ? 'text-red-500' : isNearLimit ? 'text-yellow-500' : 'text-purple-500'
                            }`}
                          />
                        </svg>
                        {isNearLimit && (
                          <span className={`absolute inset-0 flex items-center justify-center text-[10px] font-bold ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                            {MAX_CHARS - charCount}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!canSubmit}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full font-bold shadow-lg shadow-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
                  >
                    {isSubmitting
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <Send className="w-4 h-4" />
                    }
                    ポストする
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    )}
    </>
  )
}

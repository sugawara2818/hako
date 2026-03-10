'use client'

import { useState, useRef, useEffect, useTransition, useCallback } from 'react'
import { createTimelinePost } from '@/core/timeline/actions'
import { uploadPostImage } from '@/core/timeline/upload'
import { TimelinePost } from './TimelinePost'
import { Send, Image as ImageIcon, Loader2, X, ArrowDown, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TimelineFeedProps {
  hakoId: string
  currentUserId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialPosts: any[]
}

export function TimelineFeed({ hakoId, currentUserId, initialPosts }: TimelineFeedProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [content, setContent] = useState('')
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [hasDraft, setHasDraft] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
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

  // Draft Management - Load
  useEffect(() => {
    if (isComposerOpen) {
      const savedDraft = localStorage.getItem(`hako_timeline_draft_${hakoId}`)
      if (savedDraft) {
        setContent(savedDraft)
        setHasDraft(true)
      } else {
        setHasDraft(false)
      }
    }
  }, [isComposerOpen, hakoId])

  // Draft Management - Save
  useEffect(() => {
    if (isComposerOpen) {
      if (content.trim()) {
        localStorage.setItem(`hako_timeline_draft_${hakoId}`, content)
        setHasDraft(true)
      } else {
        localStorage.removeItem(`hako_timeline_draft_${hakoId}`)
        setHasDraft(false)
      }
    }
  }, [content, isComposerOpen, hakoId])

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
    localStorage.removeItem(`hako_timeline_draft_${hakoId}`)
    setHasDraft(false)
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

      const postResult = await createTimelinePost(hakoId, content, imageUrls)
      
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
      className="w-full max-w-2xl mx-auto flex flex-col border-x border-white/10 min-h-screen relative bg-black/20 animate-fade-in"
      style={{ animationDelay: '0.1s' }}
    >
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

    {/* Floating Action Button */}
    <button
      onClick={() => setIsComposerOpen(true)}
      className="fixed bottom-20 md:bottom-8 right-4 md:right-8 w-14 h-14 rounded-full bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/50 transition-all hover:scale-105 active:scale-95 z-40 group relative"
    >
      <Plus className="w-6 h-6" />
      {hasDraft && !isComposerOpen && (
        <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-yellow-400 border-2 border-[#050505] rounded-full"></span>
      )}
    </button>

    {/* Composer Modal */}
    {isComposerOpen && (
      <div className="fixed inset-0 z-[200] flex items-start md:items-center justify-center p-4 pt-20 md:pt-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isSubmitting && setIsComposerOpen(false)} />
        <div className="relative w-full max-w-xl bg-[#111] border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-white flex items-center gap-2">
              ポストする
              {hasDraft && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">下書きあり</span>}
            </h3>
            <button onClick={() => !isSubmitting && setIsComposerOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-white rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
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
              <div className={`grid gap-2 rounded-2xl overflow-hidden border border-white/10 relative ${
                previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              }`}>
                {previews.map((url, i) => (
                  <div key={url} className="relative aspect-video group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center backdrop-blur-sm transition-colors border border-white/20 z-10"
                    >
                      <X className="w-4 h-4 text-white" />
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
        </div>
      </div>
    )}
    </>
  )
}

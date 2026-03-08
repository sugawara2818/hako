'use client'

import { useState, useRef } from 'react'
import { createTimelinePost } from '@/core/timeline/actions'
import { uploadPostImage } from '@/core/timeline/upload'
import { TimelinePost } from './TimelinePost'
import { Send, Image as ImageIcon, Loader2, X } from 'lucide-react'

interface TimelineFeedProps {
  hakoId: string
  currentUserId: string
  initialPosts: any[]
}

export function TimelineFeed({ hakoId, currentUserId, initialPosts }: TimelineFeedProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('画像は10MB以下にしてください')
      return
    }

    setSelectedImage(file)
    const url = URL.createObjectURL(file)
    setImagePreview(url)
    setError(null)
  }

  const removeImage = () => {
    setSelectedImage(null)
    if (imagePreview) URL.revokeObjectURL(imagePreview)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!content.trim() && !selectedImage) || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    
    try {
      let imageUrl: string | undefined

      if (selectedImage) {
        setIsUploadingImage(true)
        const formData = new FormData()
        formData.append('file', selectedImage)
        imageUrl = await uploadPostImage(formData)
        setIsUploadingImage(false)
      }

      await createTimelinePost(hakoId, content, imageUrl)
      setContent('')
      removeImage()
    } catch (err: any) {
      console.error(err)
      setError(err.message || '投稿に失敗しました。もう一度お試しください。')
      setIsUploadingImage(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canSubmit = (content.trim() || selectedImage) && !isSubmitting

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      {/* Create Post Box */}
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

          {/* Image Preview */}
          {imagePreview && (
            <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
              <img
                src={imagePreview}
                alt="Preview"
                className="w-full max-h-80 object-cover"
              />
              {/* Remove button */}
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 hover:bg-black/90 flex items-center justify-center backdrop-blur-sm transition-colors border border-white/20"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              {isUploadingImage && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex items-center gap-2 text-white text-sm font-medium">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    アップロード中...
                  </div>
                </div>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
          
          <div className="flex items-center justify-between border-t border-white/10 pt-4">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                disabled={isSubmitting}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || !!selectedImage}
                className={`p-2 rounded-full transition-colors ${
                  selectedImage
                    ? 'text-purple-400/40 cursor-not-allowed'
                    : 'text-purple-400 hover:bg-purple-500/10 active:scale-95'
                }`}
                title="画像を追加"
              >
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-full font-bold shadow-lg shadow-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-2"
            >
              {isSubmitting
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />
              }
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

'use client'

import { useState, useRef, useEffect } from 'react'
import { Camera, Loader2, X, Send, Image as ImageIcon, ChevronLeft } from 'lucide-react'
import { uploadPostImage } from '@/core/timeline/upload'
import { createGalleryPost } from '@/core/gallery/actions'
import Image from 'next/image'

interface GalleryComposerProps {
  hakoId: string
  onSuccess: () => void
  onClose: () => void
}

export function GalleryComposer({ hakoId, onSuccess, onClose }: GalleryComposerProps) {
  const [caption, setCaption] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareToTimeline, setShareToTimeline] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      setError('画像サイズは10MB以下にしてください')
      return
    }

    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      const uploadResult = await uploadPostImage(formData)
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || '画像のアップロードに失敗しました')
      }
      setIsUploading(false)

      const postResult = await createGalleryPost(hakoId, uploadResult.url, caption.trim(), {
        is_timeline: shareToTimeline
      })
      
      if (!postResult.success) {
        throw new Error(postResult.error)
      }

      setShowSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 1500)
    } catch (err: any) {
      setError(err.message || '予期せぬエラーが発生しました')
      setIsUploading(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-[600] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
        <div className="relative flex flex-col items-center animate-in zoom-in duration-300">
          <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6">
            <Send className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">ギャラリーに追加しました！</h2>
          <p className="text-gray-400 font-bold">素敵な瞬間を共有してくれてありがとう。</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[600] flex flex-col md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/95 md:backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full h-full md:h-auto md:max-w-xl bg-black md:bg-[#0a0a0a] md:border md:border-white/10 md:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 md:duration-300">
        
        {/* Header */}
        <div className="shrink-0 p-4 md:p-6 flex items-center justify-between border-b border-white/5 bg-black/50 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-2 -ml-2 text-white/50 hover:text-white rounded-full transition-colors md:hidden">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h3 className="text-lg font-black text-white">ギャラリーに投稿</h3>
          </div>
          <button onClick={onClose} className="hidden md:block p-2 text-gray-500 hover:text-white rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
          {!selectedFile && (
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="md:hidden p-2 text-purple-400 font-bold text-sm"
            >
              写真を選択
            </button>
          )}
        </div>

        {/* Form area remains scrollable */}
        <div className="flex-1 overflow-y-auto no-scrollbar">
          <form onSubmit={handleSubmit} className="p-6 space-y-8">
            <div 
              className={`relative aspect-square rounded-3xl overflow-hidden bg-white/5 border-2 border-dashed transition-all flex flex-col items-center justify-center cursor-pointer group ${preview ? 'border-transparent' : 'border-white/10 hover:border-purple-500/50'}`}
              onClick={() => !preview && fileInputRef.current?.click()}
            >
              {preview ? (
                <>
                  <Image src={preview} alt="Preview" fill className="object-cover" />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreview(null)
                      setSelectedFile(null)
                    }}
                    className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-purple-400 p-8 text-center">
                  <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2">
                    <Camera className="w-10 h-10" />
                  </div>
                  <p className="font-black text-lg">写真を選択</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">JPG, PNG, WEBP up to 10MB</p>
                </div>
              )}

              {(isUploading || isSubmitting) && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-20">
                  <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-3" />
                  <p className="text-white font-black uppercase tracking-widest text-xs">
                    {isUploading ? 'Uploading...' : 'Saving Moment...'}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] ml-1">キャプション</label>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="この瞬間に言葉を添えて..."
                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-white text-lg focus:outline-none focus:border-purple-500/50 transition-all resize-none min-h-[120px]"
                maxLength={200}
              />
            </div>

            {/* Share to Timeline Toggle */}
            <div 
              className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/[0.08] transition-all group"
              onClick={() => setShareToTimeline(!shareToTimeline)}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${shareToTimeline ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'theme-elevated border-white/5 text-gray-500'}`}>
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-0.5">タイムラインにも共有</h4>
                  <p className="text-[10px] text-gray-500 font-bold group-hover:text-gray-400 transition-colors">メインフィードにこの投稿を表示させます</p>
                </div>
              </div>
              <div className={`w-12 h-6 rounded-full transition-all relative ${shareToTimeline ? 'bg-purple-600' : 'bg-gray-800'}`}>
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${shareToTimeline ? 'left-7' : 'left-1'}`} />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-3 animate-in slide-in-from-top-2">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                {error}
              </div>
            )}

            <div className="pb-10 pt-4 px-1 md:px-0">
              <button
                type="submit"
                disabled={!selectedFile || isSubmitting}
                className="w-full py-5 bg-white text-black hover:bg-gray-200 disabled:bg-gray-800 disabled:text-gray-500 rounded-3xl font-black shadow-2xl shadow-white/5 transition-all active:scale-[0.98] flex items-center justify-center gap-3 text-lg"
              >
                {!isSubmitting && <Send className="w-5 h-5" />}
                {isSubmitting ? '処理中...' : 'ギャラリーへ追加'}
              </button>
            </div>
          </form>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>
    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, X, Send, Image as ImageIcon } from 'lucide-react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      // 1. Upload image
      setIsUploading(true)
      const formData = new FormData()
      formData.append('file', selectedFile)
      const uploadResult = await uploadPostImage(formData)
      
      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || '画像のアップロードに失敗しました')
      }
      setIsUploading(false)

      // 2. Create post
      const postResult = await createGalleryPost(hakoId, uploadResult.url, caption.trim())
      
      if (!postResult.success) {
        throw new Error(postResult.error)
      }

      onSuccess()
    } catch (err: any) {
      setError(err.message || '予期せぬエラーが発生しました')
      setIsUploading(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 flex items-center justify-between border-b border-white/5">
          <h3 className="text-lg font-black text-white">ギャラリーに投稿</h3>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
              <div className="flex flex-col items-center gap-3 text-gray-400 group-hover:text-purple-400">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                  <Camera className="w-8 h-8" />
                </div>
                <p className="font-bold text-sm">写真をタップして選択</p>
                <p className="text-[10px] uppercase tracking-widest opacity-50">JPG, PNG, WEBP up to 10MB</p>
              </div>
            )}

            {(isUploading || isSubmitting) && (
              <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-20">
                <Loader2 className="w-10 h-10 animate-spin text-purple-400 mb-3" />
                <p className="text-white font-bold">{isUploading ? 'アップロード中...' : '保存中...'}</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">キャプション</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="この瞬間に言葉を添えて..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-purple-500/50 transition-all resize-none min-h-[100px]"
              maxLength={200}
            />
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!selectedFile || isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black shadow-xl shadow-purple-900/40 disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            ギャラリーを彩る
          </button>
        </form>

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

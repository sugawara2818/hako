'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, Check, AlertCircle } from 'lucide-react'
import { updateHako } from '@/core/hako/actions'
import { uploadPostImage } from '@/core/timeline/upload'
import { useRouter } from 'next/navigation'

interface HakoSettingsFormProps {
  hakoId: string
  initialName: string
  initialIconUrl: string | null
}

export function HakoSettingsForm({ hakoId, initialName, initialIconUrl }: HakoSettingsFormProps) {
  const [name, setName] = useState(initialName)
  const [iconUrl, setIconUrl] = useState(initialIconUrl)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('画像サイズは5MB以下にしてください')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadPostImage(formData)

      if (result.success && result.url) {
        setIconUrl(result.url)
      } else {
        throw new Error(result.error || '画像のアップロードに失敗しました')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateHako(hakoId, { 
        name: name.trim(), 
        icon_url: iconUrl 
      })

      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
         throw new Error('設定の更新に失敗しました')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="relative group">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-3xl overflow-hidden shadow-2xl border-2 border-white/10 group-hover:border-purple-500/50 transition-all">
            {iconUrl ? (
              <img src={iconUrl} alt="Hako Icon" className="w-full h-full object-cover" />
            ) : (
              name.charAt(0).toUpperCase()
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
              </div>
            )}
          </div>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-2 -right-2 p-2.5 rounded-2xl bg-white text-black shadow-lg hover:bg-gray-100 hover:scale-110 active:scale-95 transition-all z-10"
            disabled={isUploading}
          >
            <Camera className="w-4 h-4" />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleIconUpload}
          />
        </div>
        <p className="text-xs text-gray-400">箱のアイコン画像をアップロード</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-bold text-gray-400 ml-1">箱の名前</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full glass border border-white/10 rounded-2xl px-5 py-3.5 text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all"
          placeholder="箱の名前を入力"
          maxLength={50}
          required
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-in fade-in slide-in-from-top-1">
          <Check className="w-4 h-4 shrink-0" />
          設定を保存しました
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting || isUploading}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-2xl font-bold shadow-xl shadow-purple-900/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
        設定を保存する
      </button>
    </form>
  )
}

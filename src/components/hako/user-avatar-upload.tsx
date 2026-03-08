'use client'

import { useState, useRef } from 'react'
import { User, Loader2, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { updateUserAvatar } from '@/core/hako/actions'

interface UserAvatarUploadProps {
  hakoId: string
  avatarUrl: string | null
  size?: number
  className?: string
}

export function UserAvatarUpload({ hakoId, avatarUrl, size = 40, className = '' }: UserAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit file size to 2MB to keep things fast
    if (file.size > 2 * 1024 * 1024) {
      alert('画像サイズは2MB以下にしてください')
      return
    }

    setIsUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${hakoId}/${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to existing hako-assets bucket
      const { error: uploadError } = await supabase.storage
        .from('hako-assets')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('hako-assets')
        .getPublicUrl(fileName)

      // Update hako_members avatar_url via Server Action
      await updateUserAvatar(hakoId, publicUrl)

    } catch (error) {
      console.error('Upload Error:', error)
      alert('画像のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className={`relative group shrink-0 ${className}`}>
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="relative block rounded-full overflow-hidden bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 group-hover:border-purple-500/50 transition-colors focus:outline-none"
        style={{ width: size, height: size }}
      >
        {isUploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
          </div>
        ) : null}
        
        {avatarUrl ? (
          <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className="w-1/2 h-1/2 text-gray-400 group-hover:text-purple-400 transition-colors" />
          </div>
        )}

        {/* Hover overlay for indicating it's clickable */}
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <Camera className="w-4 h-4 text-white" />
        </div>
      </button>

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
      />
    </div>
  )
}

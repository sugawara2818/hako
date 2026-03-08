'use client'

import { useState, useRef } from 'react'
import { User, Loader2, Camera } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { updateUserAvatar } from '@/core/hako/actions'
import { ImageCropperModal } from './image-cropper-modal'

interface UserAvatarUploadProps {
  hakoId: string
  avatarUrl: string | null
  size?: number
  className?: string
}

export function UserAvatarUpload({ hakoId, avatarUrl, size = 40, className = '' }: UserAvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Allow slightly larger files before crop, but maybe limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('画像サイズは5MB以下にしてください')
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () =>
      setSelectedImageSrc(reader.result?.toString() || null)
    )
    reader.readAsDataURL(file)
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    setSelectedImageSrc(null) // Close modal
    setIsUploading(true)

    try {
      // Use webp for cropped result
      const fileExt = 'webp'
      const fileName = `${hakoId}/${Math.random().toString(36).substring(2)}.${fileExt}`

      // Upload to existing hako-assets bucket
      const { error: uploadError } = await supabase.storage
        .from('hako-assets')
        .upload(fileName, croppedBlob)

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

  const handleCropCancel = () => {
    setSelectedImageSrc(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <div className={`relative group shrink-0 ${className}`}>
        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || !!selectedImageSrc}
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

      {selectedImageSrc && (
        <ImageCropperModal
          imageSrc={selectedImageSrc}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </>
  )
}

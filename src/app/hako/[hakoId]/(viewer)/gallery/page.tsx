'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Camera, Loader2 } from 'lucide-react'
import { getGalleryImages, deleteGalleryPost } from '@/core/gallery/actions'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { GalleryComposer } from '@/components/gallery/GalleryComposer'
import { useParams, useRouter } from 'next/navigation'

export default function GalleryPage() {
  const params = useParams()
  const hakoId = params.hakoId as string
  const router = useRouter()
  
  const [images, setImages] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)

  const fetchImages = useCallback(async () => {
    try {
      const data = await getGalleryImages(hakoId)
      setImages(data)
    } catch (err) {
      console.error('Failed to fetch gallery images:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hakoId])

  useEffect(() => {
    fetchImages()
  }, [fetchImages])

  const handleDelete = async (postId: string) => {
    await deleteGalleryPost(postId, hakoId)
    setImages(prev => prev.filter(img => img.id !== postId))
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-6 py-8 md:px-10 border-b theme-border bg-black/20 backdrop-blur-md sticky top-0 z-30">
        <div>
          <h1 className="text-2xl md:text-3xl font-black heading-gradient">
            共有ギャラリー
          </h1>
          <p className="text-[10px] theme-muted mt-1 uppercase tracking-[0.2em] font-black opacity-60">
            {isLoading ? '読み込み中...' : `${images.length} MOMENTS`}
          </p>
        </div>

        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-black text-sm hover:scale-105 active:scale-95 transition-all shadow-xl shadow-white/10"
        >
          <Camera className="w-4 h-4" />
          <span className="hidden sm:inline">投稿する</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500/50" />
            <p className="text-xs font-black theme-muted uppercase tracking-widest">Memories are loading...</p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <GalleryGrid 
              images={images} 
              hakoId={hakoId} 
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {showComposer && (
        <GalleryComposer 
          hakoId={hakoId}
          onClose={() => setShowComposer(false)}
          onSuccess={() => {
            setShowComposer(false)
            fetchImages()
          }}
        />
      )}
    </div>
  )
}

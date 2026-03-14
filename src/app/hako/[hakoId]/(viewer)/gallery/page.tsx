'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Camera, Loader2, FolderPlus, Library, MonitorPlay, X } from 'lucide-react'
import Image from 'next/image'
import { getGalleryImages, deleteGalleryPost, getAlbums } from '@/core/gallery/actions'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'
import { AlbumCreator } from '@/components/gallery/AlbumCreator'
import { GalleryComposer } from '@/components/gallery/GalleryComposer'
import { useParams, useRouter } from 'next/navigation'
import { GalleryCinemaMode } from '@/components/gallery/GalleryCinemaMode'

export default function GalleryPage() {
  const params = useParams()
  const hakoId = params.hakoId as string
  const router = useRouter()
  
  const [images, setImages] = useState<any[]>([])
  const [albums, setAlbums] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'featured' | 'discovery' | 'albums'>('featured')
  const [showAlbumCreator, setShowAlbumCreator] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [showCinemaMode, setShowCinemaMode] = useState(false)
  const [selectedAlbumId, setSelectedAlbumId] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [imagesData, albumsData] = await Promise.all([
        getGalleryImages(hakoId, filter === 'albums' ? 'discovery' : filter),
        getAlbums(hakoId)
      ])
      setImages(imagesData)
      setAlbums(albumsData)
    } catch (err) {
      console.error('Failed to fetch gallery data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [hakoId, filter])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleDelete = async (postId: string) => {
    await deleteGalleryPost(postId, hakoId)
    setImages(prev => prev.filter(img => img.id !== postId))
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-10 border-b theme-border theme-bg sticky top-0 z-30">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black heading-gradient">
              共有ギャラリー
            </h1>
            <p className="text-[10px] theme-muted mt-1 uppercase tracking-[0.2em] font-black opacity-60">
              {isLoading ? '集計中...' : filter === 'albums' ? `${albums.length} ALBUMS` : `${images.length} MOMENTS`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowComposer(true)}
              className="flex items-center gap-2 px-4 md:px-6 py-3 bg-white text-black rounded-2xl font-black text-xs hover:bg-gray-200 active:scale-95 transition-all shadow-xl shadow-white/5"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden md:inline">写真を投稿</span>
            </button>
            <button
              onClick={() => setShowCinemaMode(true)}
              disabled={images.length === 0}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-2xl font-black text-xs hover:bg-purple-500 active:scale-95 transition-all shadow-xl shadow-purple-900/40 disabled:opacity-50"
            >
              <MonitorPlay className="w-4 h-4" />
              シネマ再生
            </button>
            <button
              onClick={() => setShowAlbumCreator(true)}
              className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white rounded-2xl font-black text-xs hover:bg-white/10 active:scale-95 transition-all"
            >
              <FolderPlus className="w-4 h-4 text-purple-400" />
              アルバム作成
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl w-fit overflow-x-auto hide-scrollbar max-w-full">
          <button
            onClick={() => {
              setFilter('featured')
              setSelectedAlbumId(null)
            }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
              filter === 'featured' && !selectedAlbumId
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            傑作選
          </button>
          <button
            onClick={() => {
              setFilter('discovery')
              setSelectedAlbumId(null)
            }}
            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
              filter === 'discovery' && !selectedAlbumId
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            新着写真
          </button>
          <button
            onClick={() => setFilter('albums')}
            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all whitespace-nowrap ${
              filter === 'albums' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' 
                : 'text-gray-500 hover:text-white'
            }`}
          >
            アルバム
          </button>
        </div>

        {/* Selected Album Indicator */}
        {selectedAlbumId && (
          <div className="mt-6 flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-2xl px-6 py-4 animate-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-4">
               <Library className="w-5 h-5 text-purple-400" />
               <div>
                  <h4 className="text-white font-black text-sm">
                    {albums.find(a => a.id === selectedAlbumId)?.name || 'アルバム'}
                  </h4>
                  <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">Viewing Collection</p>
               </div>
            </div>
            <button 
              onClick={() => setSelectedAlbumId(null)}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar custom-scrollbar">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-purple-500/50" />
            <p className="text-xs font-black theme-muted uppercase tracking-widest">Memories are loading...</p>
          </div>
        ) : filter === 'albums' ? (
          <div className="max-w-6xl mx-auto p-4 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {albums.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <p className="text-lg font-bold mb-2 text-white/40">アルバムはまだありません</p>
                <p className="text-sm">思い出をコレクションにまとめてみましょう。</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {albums.map((album) => (
                  <div 
                    key={album.id} 
                    onClick={() => {
                      setSelectedAlbumId(album.id)
                      setFilter('discovery')
                    }}
                    className="relative aspect-[4/3] group cursor-pointer overflow-hidden rounded-[2rem] border border-white/5 bg-white/5 hover:border-purple-500/30 transition-all"
                  >
                    {album.cover_url ? (
                      <Image src={album.cover_url} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900/40 to-black">
                        <Library className="w-12 h-12 text-purple-500/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-8 flex flex-col justify-end">
                      <h4 className="text-xl font-black text-white mb-2">{album.name}</h4>
                      {album.description && <p className="text-xs text-gray-400 line-clamp-2 mb-4">{album.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <GalleryGrid 
              images={selectedAlbumId ? images.filter(img => img.albumId === selectedAlbumId) : images} 
              albums={albums}
              hakoId={hakoId} 
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {showAlbumCreator && (
        <AlbumCreator 
          hakoId={hakoId}
          onClose={() => setShowAlbumCreator(false)}
          onSuccess={() => {
            setShowAlbumCreator(false)
            fetchData()
          }}
        />
      )}

      {showComposer && (
        <GalleryComposer
          hakoId={hakoId}
          onClose={() => setShowComposer(false)}
          onSuccess={() => {
            setShowComposer(false)
            fetchData()
          }}
        />
      )}

      {showCinemaMode && (
        <GalleryCinemaMode
          images={selectedAlbumId ? images.filter(img => img.albumId === selectedAlbumId) : images}
          onClose={() => setShowCinemaMode(false)}
        />
      )}
    </div>
  )
}

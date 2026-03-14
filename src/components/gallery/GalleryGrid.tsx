'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ExternalLink, Calendar as CalendarIcon, Download, Trash2, Loader2, Image as ImageIcon, FolderPlus } from 'lucide-react'
import { toggleGalleryPin, addPostToAlbum } from '@/core/gallery/actions'

interface GalleryImage {
  id: string
  url: string
  caption?: string | null
  createdAt: string
  userName: string
  userAvatar: string | null
  isPinned: boolean
  albumId?: string | null
}

interface GalleryGridProps {
  images: GalleryImage[]
  albums: any[]
  hakoId: string
  onDelete?: (id: string) => void
}

export function GalleryGrid({ images, albums, hakoId, onDelete }: GalleryGridProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isPinning, setIsPinning] = useState(false)
  const [isAddingToAlbum, setIsAddingToAlbum] = useState(false)

  const handlePin = async (postId: string, currentPinned: boolean) => {
    setIsPinning(true)
    try {
      const result = await toggleGalleryPin(postId, hakoId, !currentPinned)
      if (result.success && selectedImage && selectedImage.id === postId) {
        setSelectedImage({ ...selectedImage, isPinned: !currentPinned })
      }
    } finally {
      setIsPinning(false)
    }
  }

  const handleAddToAlbum = async (postId: string, albumId: string) => {
    setIsAddingToAlbum(true)
    try {
      const result = await addPostToAlbum(postId, albumId, hakoId)
      if (result.success && selectedImage && selectedImage.id === postId) {
        setSelectedImage({ ...selectedImage, albumId })
      }
    } finally {
      setIsAddingToAlbum(false)
    }
  }

  const handleDelete = async (postId: string) => {
    if (!window.confirm('この投稿を削除しますか？')) return
    setIsDeleting(true)
    try {
      if (onDelete) {
        await onDelete(postId)
        setSelectedImage(null)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="text-lg font-bold mb-2 text-white/40">写真はまだありません</p>
          <p className="text-sm">タイムラインに投稿された写真がここに集まります。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-300 border border-white/5 bg-white/5"
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                {image.isPinned && (
                  <div className="absolute top-2 right-2 p-1 bg-purple-500 rounded-lg shadow-lg">
                    <ImageIcon className="w-3 h-3 text-white" />
                  </div>
                )}
                {image.caption && (
                  <p className="text-[10px] text-white/80 line-clamp-1 mb-1 font-medium">{image.caption}</p>
                )}
                <p className="text-[10px] font-black text-white truncate">{image.userName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox - Instagram Style */}
      {selectedImage && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/95 backdrop-blur-md" onClick={() => setSelectedImage(null)} />
          
          <div className="relative w-full max-w-5xl max-h-[95vh] flex flex-col md:flex-row bg-[#080808] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
            {/* Action buttons atop Photo */}
            <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
              <button
                onClick={() => handlePin(selectedImage.id, selectedImage.isPinned)}
                disabled={isPinning}
                className={`p-3 rounded-2xl transition-all shadow-xl backdrop-blur-md border ${
                  selectedImage.isPinned 
                    ? 'bg-purple-600 text-white border-purple-400' 
                    : 'bg-black/80 text-white/50 border-white/10 hover:text-white'
                }`}
                title={selectedImage.isPinned ? '展示から外す' : '傑作としてギャラリーに展示'}
              >
                {isPinning ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5" />}
              </button>
            </div>

            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors z-[10]"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Photo Section */}
            <div className="flex-1 bg-black flex items-center justify-center min-h-[40vh] md:min-h-0 relative">
              <Image
                src={selectedImage.url}
                alt=""
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain"
                unoptimized
              />
            </div>

            {/* Info Section */}
            <div className="w-full md:w-[400px] flex flex-col border-l border-white/5">
              <div className="p-6 flex items-center gap-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white overflow-hidden shrink-0 shadow-lg">
                  {selectedImage.userAvatar ? (
                    <Image src={selectedImage.userAvatar} alt="" width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    selectedImage.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="font-black text-white truncate text-sm">{selectedImage.userName}</span>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3 h-3 text-gray-400" />
                    <span className="text-[10px] font-bold text-gray-500">
                      {new Date(selectedImage.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-gray-200">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">キャプション</label>
                  {selectedImage.caption ? (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{selectedImage.caption}</p>
                  ) : (
                    <p className="text-xs text-white/20 italic">なし</p>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-none">アルバムに追加</label>
                  <div className="flex flex-wrap gap-2">
                    {albums.length === 0 && <p className="text-[10px] text-gray-600">アルバムがまだありません</p>}
                    {albums.map((album) => {
                      const isActive = selectedImage.albumId === album.id
                      return (
                        <button
                          key={album.id}
                          onClick={() => handleAddToAlbum(selectedImage.id, album.id)}
                          disabled={isAddingToAlbum || isActive}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black transition-all border ${
                            isActive 
                              ? 'bg-purple-600 text-white border-purple-400' 
                              : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/20 hover:text-white'
                          }`}
                        >
                          {album.name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-white/5 space-y-3">
                <div className="flex items-center gap-3">
                  <a
                    href={selectedImage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    フルサイズ
                  </a>
                  <a
                    href={selectedImage.url}
                    download
                    className="p-3 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl transition-all shadow-lg shadow-purple-900/40"
                  >
                    <Download className="w-5 h-5" />
                  </a>
                </div>

                {onDelete && (
                  <button
                    onClick={() => handleDelete(selectedImage.id)}
                    disabled={isDeleting}
                    className="w-full py-3 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-all text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 rounded-xl"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    この投稿を削除
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

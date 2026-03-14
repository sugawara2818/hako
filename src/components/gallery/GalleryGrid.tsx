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

      {/* Lightbox - Premium Immersive Style */}
      {selectedImage && (
        <div className="fixed inset-0 z-[500] flex flex-col theme-bg animate-in fade-in duration-200">
          {/* Top Navigation Bar */}
          <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b theme-border backdrop-blur-md sticky top-0 z-20">
            <button
              onClick={() => setSelectedImage(null)}
              className="p-2 -ml-2 theme-text hover:theme-elevated rounded-full transition-all flex items-center gap-2 font-bold group"
            >
              <div className="w-8 h-8 flex items-center justify-center rounded-full theme-elevated group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-colors">
                <X className="w-5 h-5" />
              </div>
              <span>戻る</span>
            </button>
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-[10px] shadow-lg overflow-hidden">
                  {selectedImage.userAvatar ? (
                    <Image src={selectedImage.userAvatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    selectedImage.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-xs font-black theme-text truncate max-w-[120px]">{selectedImage.userName}</span>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row min-h-0">
            {/* Image Stage - Centered and full-view */}
            <div className="flex-[3] bg-black/40 md:bg-black/20 flex items-center justify-center p-4 md:p-8 relative min-h-[50vh] md:min-h-0">
              <div className="relative w-full h-full flex items-center justify-center">
                <Image
                  src={selectedImage.url}
                  alt=""
                  width={1600}
                  height={1200}
                  className="max-w-full max-h-full w-auto h-auto object-contain shadow-2xl rounded-lg"
                  priority
                  unoptimized
                />
              </div>
            </div>

            {/* Sidebar Information - Premium Layout */}
            <div className="flex-1 md:w-[400px] flex flex-col border-l theme-border overflow-y-auto custom-scrollbar theme-surface/20">
              {/* Info Header */}
              <div className="p-6 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 theme-muted" />
                    <span className="text-[10px] font-black uppercase tracking-widest theme-muted">
                      {new Date(selectedImage.createdAt).toLocaleString('ja-JP', { 
                        year: 'numeric', month: 'long', day: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>

                  {selectedImage.caption ? (
                    <div className="p-4 rounded-3xl theme-elevated border theme-border shadow-sm">
                      <p className="text-sm leading-relaxed theme-text whitespace-pre-wrap">{selectedImage.caption}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-3xl theme-elevated border theme-border/30 border-dashed">
                      <p className="text-xs theme-muted italic">キャプションはありません</p>
                    </div>
                  )}
                </div>

                {/* Album Management */}
                <div className="space-y-4 pt-4 border-t theme-border">
                  <div className="flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-purple-400" />
                    <label className="text-[10px] font-black theme-text uppercase tracking-[0.2em]">Add to Collection</label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {albums.length === 0 ? (
                      <p className="text-[10px] theme-muted px-2 italic">アルバムが登録されていません</p>
                    ) : (
                      albums.map((album) => {
                        const isActive = selectedImage.albumId === album.id
                        return (
                          <button
                            key={album.id}
                            onClick={() => handleAddToAlbum(selectedImage.id, album.id)}
                            disabled={isAddingToAlbum || isActive}
                            className={`px-4 py-2 rounded-2xl text-[10px] font-black transition-all border ${
                              isActive 
                                ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-900/30' 
                                : 'theme-surface theme-text border-theme-border hover:theme-elevated hover:border-purple-500/30'
                            }`}
                          >
                            {album.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Action Bar - Fixed Bottom in Sidebar */}
              <div className="mt-auto p-6 bg-gradient-to-t from-theme-elevated to-transparent pt-12">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <a
                      href={selectedImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-12 theme-surface hover:theme-elevated theme-text rounded-2xl font-black transition-all flex items-center justify-center gap-2 text-xs border theme-border shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      フルサイズ
                    </a>
                    <a
                      href={selectedImage.url}
                      download
                      className="w-12 h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl transition-all shadow-xl shadow-purple-900/30 flex items-center justify-center shrink-0"
                    >
                      <Download className="w-5 h-5" />
                    </a>
                  </div>

                  {onDelete && (
                    <button
                      onClick={() => handleDelete(selectedImage.id)}
                      disabled={isDeleting}
                      className="w-full h-12 theme-bg border theme-border hover:bg-red-500/10 text-red-500/60 hover:text-red-500 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                    >
                      {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      この投稿を削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

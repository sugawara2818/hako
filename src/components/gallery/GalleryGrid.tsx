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

      {/* Lightbox - Premium Immersive Style (Scrollable Stack) */}
      {selectedImage && (
        <div className="fixed inset-0 z-[500] flex flex-col theme-bg animate-in fade-in duration-300 overflow-hidden">
          {/* Top Navigation Bar - Sticky */}
          <div className="flex items-center justify-between px-4 h-16 shrink-0 border-b theme-border backdrop-blur-md sticky top-0 z-50 theme-bg/80">
            <button
              onClick={() => setSelectedImage(null)}
              className="p-2 -ml-2 theme-text hover:theme-elevated rounded-full transition-all flex items-center gap-3 font-black group px-4"
            >
              <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>戻る</span>
            </button>
            
            <div className="flex items-center gap-3 pr-2">
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-[10px] shadow-lg overflow-hidden border theme-border">
                  {selectedImage.userAvatar ? (
                    <Image src={selectedImage.userAvatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
                  ) : (
                    selectedImage.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col -space-y-0.5">
                  <span className="text-[11px] font-black theme-text truncate max-w-[120px]">{selectedImage.userName}</span>
                  <span className="text-[9px] font-bold theme-muted uppercase tracking-tighter">Contributor</span>
                </div>
            </div>
          </div>
          
          {/* Scrollable Content Stage */}
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center">
            <div className="w-full max-w-4xl mx-auto flex flex-col pb-20">
              
              {/* Photo Stage - Massive View */}
              <div className="w-full p-4 md:p-8 flex items-center justify-center min-h-[40vh] md:min-h-[60vh]">
                <div className="relative w-full h-full flex items-center justify-center shadow-2xl rounded-3xl overflow-hidden theme-surface/10 ring-1 ring-white/5">
                  <Image
                    src={selectedImage.url}
                    alt=""
                    width={2000}
                    height={1500}
                    className="w-full h-auto max-h-[85vh] object-contain"
                    priority
                    unoptimized
                  />
                </div>
              </div>

              {/* Information Section - Wide Stack */}
              <div className="px-6 md:px-12 space-y-10">
                
                {/* Meta & Caption Block */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 px-4 py-2 bg-purple-500/5 rounded-full w-fit border border-purple-500/10">
                    <CalendarIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-400">
                      Captured on {new Date(selectedImage.createdAt).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                  </div>

                  {selectedImage.caption ? (
                    <div className="p-8 rounded-[2rem] theme-elevated border theme-border shadow-xl">
                      <p className="text-base md:text-lg leading-relaxed theme-text whitespace-pre-wrap font-medium">
                        {selectedImage.caption}
                      </p>
                    </div>
                  ) : (
                    <div className="p-8 rounded-[2rem] theme-surface/20 border border-dashed theme-border flex items-center justify-center">
                      <p className="text-sm theme-muted italic font-bold opacity-30">NO CAPTION PROVIDED</p>
                    </div>
                  )}
                </div>

                {/* Collections Block */}
                <div className="space-y-6 pt-6 border-t theme-border">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl theme-elevated flex items-center justify-center border theme-border">
                      <FolderPlus className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black theme-text uppercase tracking-widest">Collections</h4>
                      <p className="text-[10px] theme-muted font-bold">Add this memory to an album</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2.5">
                    {albums.length === 0 ? (
                      <p className="text-xs theme-muted p-4 bg-white/5 rounded-2xl w-full text-center font-bold">No albums created in this Hako yet.</p>
                    ) : (
                      albums.map((album) => {
                        const isActive = selectedImage.albumId === album.id
                        return (
                          <button
                            key={album.id}
                            onClick={() => handleAddToAlbum(selectedImage.id, album.id)}
                            disabled={isAddingToAlbum || isActive}
                            className={`px-6 py-3 rounded-2xl text-[10px] font-black transition-all border shadow-lg ${
                              isActive 
                                ? 'bg-purple-600 text-white border-purple-400 shadow-purple-900/30' 
                                : 'theme-surface theme-text border-theme-border hover:theme-elevated hover:border-purple-500/50 hover:scale-[1.02]'
                            }`}
                          >
                            {album.name}
                          </button>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Primary Actions Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-10">
                  <div className="flex gap-3">
                    <a
                      href={selectedImage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 h-16 theme-elevated hover:theme-surface theme-text rounded-3xl font-black transition-all flex items-center justify-center gap-3 text-sm border theme-border shadow-xl group"
                    >
                      <ExternalLink className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      FULL SIZE
                    </a>
                    <a
                      href={selectedImage.url}
                      download
                      className="w-16 h-16 bg-purple-600 hover:bg-purple-500 text-white rounded-3xl transition-all shadow-xl shadow-purple-900/40 flex items-center justify-center shrink-0 group"
                    >
                      <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </a>
                  </div>

                  {onDelete && (
                    <button
                      onClick={() => handleDelete(selectedImage.id)}
                      disabled={isDeleting}
                      className="h-16 theme-surface border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all opacity-80 hover:opacity-100"
                    >
                      {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                      PERMANENTLY DELETE
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

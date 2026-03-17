'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Calendar as CalendarIcon, Download, Trash2, Loader2, Image as ImageIcon, FolderPlus, ChevronLeft, Send } from 'lucide-react'
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
  columns?: number
  isSelectionMode?: boolean
  selectedIds?: string[]
  onToggleSelect?: (id: string) => void
}

export function GalleryGrid({ 
  images, 
  albums, 
  hakoId, 
  onDelete, 
  columns,
  isSelectionMode = false,
  selectedIds = [],
  onToggleSelect
}: GalleryGridProps) {
  const [localImages, setLocalImages] = useState<GalleryImage[]>(images)
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  
  // Sync local state when props change
  useEffect(() => {
    setLocalImages(images)
  }, [images])

  const [isDeleting, setIsDeleting] = useState(false)
  const [isAddingToAlbum, setIsAddingToAlbum] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)


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

  const handleDownload = async (url: string, id: string) => {
    setIsDownloading(true)
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = `hako-memory-${id}.jpg`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed:', error)
      // Fallback
      window.open(url, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedImage) return
    setIsDeleting(true)
    try {
      const result = await toggleGalleryPin(selectedImage.id, hakoId, false)
      if (result.success) {
        // Notify parent to update its state (instant feedback)
        if (onDelete) {
          onDelete(selectedImage.id)
        }
        // Also update local state just in case parent doesn't re-render immediately
        setLocalImages(prev => prev.filter(img => img.id !== selectedImage.id))
        setSelectedImage(null)
        setShowDeleteConfirm(false)
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      {localImages.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="text-lg font-bold mb-2 text-white/40">写真はまだありません</p>
          <p className="text-sm">こちらに写真が集まります。</p>
        </div>
      ) : (
      <div 
        className={`grid gap-3 ${!columns ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5' : ''}`}
        style={{ 
          gridTemplateColumns: columns 
            ? `repeat(${columns}, minmax(0, 1fr))` 
            : undefined 
        }}
      >
        {localImages.map((image) => {
          const isSelected = selectedIds.includes(image.id)
          return (
            <div
              key={image.id}
              className={`relative aspect-square rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-300 border ${
                isSelected 
                  ? 'border-[#82d9bc] ring-2 ring-[#82d9bc]/30 scale-[0.98]' 
                  : 'border-white/5 bg-white/5'
              }`}
              onClick={() => {
                if (isSelectionMode && onToggleSelect) {
                  onToggleSelect(image.id)
                } else {
                  setSelectedImage(image)
                }
              }}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className={`object-cover transition-transform duration-500 ${!isSelectionMode ? 'group-hover:scale-110' : ''}`}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
              
              {/* Selection Overlay */}
              {isSelectionMode && (
                <div className={`absolute inset-0 transition-colors duration-200 ${isSelected ? 'bg-[#82d9bc]/10' : 'bg-black/20 group-hover:bg-black/10'}`}>
                  <div className={`absolute top-2 right-2 w-6 h-6 rounded-lg flex items-center justify-center border transition-all duration-200 ${
                    isSelected 
                      ? 'bg-[#82d9bc] border-[#82d9bc] shadow-lg shadow-[#82d9bc]/20' 
                      : 'bg-black/40 border-white/20'
                  }`}>
                    {isSelected && <Send className="w-3.5 h-3.5 text-gray-700 -rotate-45" />}
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                {image.isPinned && !isSelectionMode && (
                  <div className="absolute top-2 right-2 p-1 bg-[#82d9bc] rounded-lg shadow-lg">
                    <ImageIcon className="w-3 h-3 text-gray-700" />
                  </div>
                )}
                {image.caption && (
                  <p className="text-[10px] text-white/80 line-clamp-1 mb-1 font-medium">{image.caption}</p>
                )}
                <p className="text-[10px] font-black text-white truncate">{image.userName}</p>
              </div>
            </div>
          )
        })}
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
               <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#82d9bc] to-teal-400 flex items-center justify-center font-bold text-gray-700 text-[10px] shadow-lg overflow-hidden border theme-border">
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
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center hide-scrollbar">
            <div className="w-full max-w-4xl mx-auto flex flex-col pb-20">
              
              {/* Photo Stage - Massive View */}
              <div className="w-full p-2 md:p-8 flex items-center justify-center min-h-[40vh] md:min-h-[60vh]">
                <div className="relative w-full h-full flex items-center justify-center shadow-2xl md:rounded-3xl overflow-hidden theme-surface/10 ring-1 ring-white/5 bg-black/20">
                  <Image
                    src={selectedImage.url}
                    alt=""
                    width={2000}
                    height={1500}
                    className="w-full h-auto max-h-[75vh] md:max-h-[85vh] object-contain"
                    priority
                    unoptimized
                  />
                </div>
              </div>

              {/* Information Section - Wide Stack */}
              <div className="px-6 md:px-12 space-y-10">
                
                {/* Meta & Caption Block */}
                 <div className="space-y-6">
                   <div className="flex items-center gap-3 px-4 py-2 bg-[#82d9bc]/5 rounded-full w-fit border border-[#82d9bc]/10">
                    <CalendarIcon className="w-3.5 h-3.5 text-[#82d9bc]" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#82d9bc]">
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
                      <FolderPlus className="w-5 h-5 text-[#82d9bc]" />
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
                                ? 'bg-[#82d9bc] text-gray-700 border-[#82d9bc] shadow-[#82d9bc]/20' 
                                : 'theme-surface theme-text border-theme-border hover:theme-elevated hover:border-[#82d9bc]/50 hover:scale-[1.02]'
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
                <div className="flex flex-col gap-4 pt-10">
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDownload(selectedImage.url, selectedImage.id)}
                      disabled={isDownloading}
                      className="flex-1 h-16 bg-[#82d9bc] hover:opacity-90 disabled:opacity-50 text-gray-700 rounded-3xl transition-all shadow-xl shadow-[#82d9bc]/20 flex items-center justify-center gap-3 group font-black"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Download className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      )}
                      <span>{isDownloading ? 'DOWNLOADING...' : 'DOWNLOAD PHOTO'}</span>
                    </button>
                  </div>

                  {onDelete && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="h-16 theme-surface border border-red-500/20 text-red-500 hover:bg-red-500/10 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all opacity-80 hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                      REMOVE FROM GALLERY
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Custom Delete Confirmation Modal - Matched with Timeline Style */}
      {showDeleteConfirm && selectedImage && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" 
            onClick={() => !isDeleting && setShowDeleteConfirm(false)} 
          />
          <div className="relative w-full max-w-[300px] theme-elevated border theme-border rounded-[2rem] p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <p className="text-sm theme-text leading-relaxed mb-6 text-center font-bold">
              この写真をギャラリーから削除しますか？<br/>
              <span className="text-[10px] theme-muted font-black opacity-60 uppercase">※タイムラインの投稿は削除されません</span>
            </p>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {isDeleting ? '処理中...' : 'ギャラリーから削除'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="w-full py-3 theme-surface border theme-border theme-text hover:theme-elevated rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

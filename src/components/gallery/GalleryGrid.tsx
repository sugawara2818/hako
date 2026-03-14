'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ExternalLink, Calendar as CalendarIcon, Download, Trash2, Loader2 } from 'lucide-react'

interface GalleryImage {
  id: string
  url: string
  caption?: string | null
  createdAt: string
  userName: string
  userAvatar: string | null
}

interface GalleryGridProps {
  images: GalleryImage[]
  hakoId: string
  onDelete?: (id: string) => void
}

export function GalleryGrid({ images, hakoId, onDelete }: GalleryGridProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

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
          <p className="text-lg font-bold mb-2 text-white/40">ギャラリーはまだ空っぽです</p>
          <p className="text-sm">お気に入りの一枚を投稿してみましょう。</p>
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

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {selectedImage.caption ? (
                  <p className="text-sm leading-relaxed text-gray-200 whitespace-pre-wrap">{selectedImage.caption}</p>
                ) : (
                  <p className="text-xs text-white/20 italic">キャプションなし</p>
                )}
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

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { X, ExternalLink, User, Calendar as CalendarIcon, Download } from 'lucide-react'

interface GalleryImage {
  id: string
  postId: string
  url: string
  createdAt: string
  userName: string
  userAvatar: string | null
}

interface GalleryGridProps {
  images: GalleryImage[]
}

export function GalleryGrid({ images }: GalleryGridProps) {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null)

  return (
    <div className="p-4 md:p-8">
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <p className="text-lg font-bold mb-2">画像がありません</p>
          <p className="text-sm">タイムラインに画像を投稿するとここに表示されます。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group hover:scale-[1.02] transition-all duration-300 border border-white/5"
              onClick={() => setSelectedImage(image)}
            >
              <Image
                src={image.url}
                alt=""
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-3 flex flex-col justify-end">
                <p className="text-[10px] font-bold text-white truncate">{image.userName}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {selectedImage && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={() => setSelectedImage(null)} />
          
          <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col gap-4 animate-in zoom-in-95 duration-300">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>

            <div className="relative flex-1 bg-black/40 rounded-3xl overflow-hidden min-h-[50vh] flex items-center justify-center">
              <Image
                src={selectedImage.url}
                alt=""
                width={1200}
                height={800}
                className="max-w-full max-h-full object-contain"
                unoptimized
              />
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-6 rounded-[2.5rem] flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg overflow-hidden shrink-0">
                  {selectedImage.userAvatar ? (
                    <Image src={selectedImage.userAvatar} alt="" width={48} height={48} className="w-full h-full object-cover" />
                  ) : (
                    selectedImage.userName.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-purple-400" />
                    <span className="font-bold text-white">{selectedImage.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {new Date(selectedImage.createdAt).toLocaleString('ja-JP')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 md:flex-none px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  フルサイズを表示
                </a>
                <a
                  href={selectedImage.url}
                  download
                  className="px-4 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20"
                >
                  <Download className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

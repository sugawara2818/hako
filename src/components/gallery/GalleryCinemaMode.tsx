'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, Play, Pause, ImageIcon } from 'lucide-react'

interface CinemaImage {
  id: string
  url: string
  caption?: string | null
  userName: string
  createdAt: string
}

interface GalleryCinemaModeProps {
  images: CinemaImage[]
  onClose: () => void
}

export function GalleryCinemaMode({ images, onClose }: GalleryCinemaModeProps) {
  const [index, setIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  const next = useCallback(() => {
    setIndex((prev) => (prev + 1) % images.length)
  }, [images.length])

  const prev = useCallback(() => {
    setIndex((prev) => (prev - 1 + images.length) % images.length)
  }, [images.length])

  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(next, 5000)
    return () => clearInterval(timer)
  }, [isPlaying, next])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'Escape') onClose()
      if (e.key === ' ') setIsPlaying(!isPlaying)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [next, prev, onClose, isPlaying])

  if (images.length === 0) return null

  const current = images[index]

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center animate-in fade-in duration-500 overflow-hidden">
      {/* Background Blur */}
      <div className="absolute inset-0 opacity-30 select-none pointer-events-none">
        <Image src={current.url} alt="" fill className="object-cover blur-[100px]" unoptimized />
      </div>

      {/* Header UI */}
      <div className="absolute top-0 inset-x-0 p-6 flex items-center justify-between z-10 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-500 rounded-xl shadow-lg">
             <ImageIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-white font-black text-xs uppercase tracking-widest">Cinema Exhibition</h3>
            <p className="text-gray-400 text-[10px] uppercase tracking-wider">{index + 1} / {images.length}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button 
            onClick={onClose}
            className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Exhibition Area */}
      <div className="relative flex-1 w-full flex items-center justify-center p-4 md:p-12">
        <div className="relative w-full h-full animate-in zoom-in-95 duration-700">
           <Image 
             src={current.url} 
             alt="" 
             fill 
             className="object-contain drop-shadow-[0_0_50px_rgba(0,0,0,0.8)]"
             unoptimized
           />
        </div>

        {/* Navigation Overlays */}
        <button onClick={prev} className="absolute left-4 p-4 text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-full">
          <ChevronLeft className="w-10 h-10" />
        </button>
        <button onClick={next} className="absolute right-4 p-4 text-white/20 hover:text-white transition-all hover:bg-white/5 rounded-full">
          <ChevronRight className="w-10 h-10" />
        </button>
      </div>

      {/* Caption Overlay - Cinematic Style */}
      <div className="absolute bottom-0 inset-x-0 p-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-center z-10">
        <div className="max-w-3xl mx-auto space-y-4 animate-in slide-in-from-bottom-8 duration-700">
          {current.caption && (
            <p className="text-2xl md:text-3xl font-medium text-white/90 leading-tight italic">
              "{current.caption}"
            </p>
          )}
          <div className="flex items-center justify-center gap-3">
            <div className="h-[1px] w-8 bg-purple-500/50" />
            <span className="text-[10px] font-black text-purple-400 uppercase tracking-[0.2em]">
              Captured by {current.userName}
            </span>
            <div className="h-[1px] w-8 bg-purple-500/50" />
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="absolute bottom-0 inset-x-0 h-1 bg-white/5">
        <div 
          className="h-full bg-purple-500 transition-all duration-[5000ms] ease-linear"
          key={index + (isPlaying ? '-playing' : '-paused')}
          style={{ width: isPlaying ? '100%' : '0%' }}
        />
      </div>
    </div>
  )
}

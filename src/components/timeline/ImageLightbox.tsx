'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut } from 'lucide-react'

interface ImageLightboxProps {
  url: string
  onClose: () => void
}

export function ImageLightbox({ url, onClose }: ImageLightboxProps) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const hasMoved = useRef(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePointerDown = (e: React.PointerEvent<HTMLImageElement>) => {
    if (scale > 1) {
      isDragging.current = true
      hasMoved.current = false
      dragStart.current = { x: e.clientX - position.x, y: e.clientY - position.y }
      e.currentTarget.setPointerCapture(e.pointerId)
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLImageElement>) => {
    if (isDragging.current && scale > 1) {
      hasMoved.current = true
      setPosition({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLImageElement>) => {
    isDragging.current = false
    e.currentTarget.releasePointerCapture(e.pointerId)
  }

  const handleWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    const delta = e.deltaY * -0.005
    const newScale = Math.min(Math.max(1, scale + delta), 4)
    setScale(newScale)
    if (newScale === 1) setPosition({ x: 0, y: 0 })
  }

  const handleClick = (e: React.MouseEvent) => {
    if (hasMoved.current) return
    e.stopPropagation() // Prevent click from closing modal if clicking image
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (hasMoved.current) return
    e.stopPropagation()
    if (scale > 1) {
      setScale(1)
      setPosition({ x: 0, y: 0 })
    } else {
      setScale(2.5) // Zoom in on double click
    }
  }

  const resetZoom = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95">
      <button 
        type="button"
        className="absolute top-4 left-4 p-3 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors z-[310]"
        onClick={onClose}
      >
        <X className="w-6 h-6" />
      </button>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-md px-4 py-2 rounded-full text-white z-[310]">
        <button 
          onClick={() => {
            const newScale = Math.max(1, scale - 0.5)
            setScale(newScale)
            if (newScale === 1) setPosition({ x: 0, y: 0 })
          }} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ZoomOut className="w-5 h-5"/>
        </button>
        <span 
          className="text-sm font-bold min-w-[3.5rem] text-center cursor-pointer hover:text-purple-400 select-none"
          onClick={resetZoom}
          title="リセット"
        >
          {Math.round(scale * 100)}%
        </span>
        <button 
          onClick={() => setScale(Math.min(4, scale + 0.5))} 
          className="p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <ZoomIn className="w-5 h-5"/>
        </button>
      </div>
      
      <div 
        className="w-full h-full p-4 flex items-center justify-center overflow-hidden touch-none" 
        onClick={onClose}
      >
        <img 
          src={url} 
          alt="Enlarged view" 
          className={`max-w-full max-h-full object-contain ${scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'} transition-transform`}
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transitionDuration: isDragging.current ? '0ms' : '200ms'
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onWheel={handleWheel}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          draggable={false}
        />
      </div>
    </div>,
    document.body
  )
}

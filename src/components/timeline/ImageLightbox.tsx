'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  images: string[]
  initialIndex: number
  onClose: () => void
}

export function ImageLightbox({ images, initialIndex, onClose }: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const containerRef = useRef<HTMLDivElement>(null)
  
  // Mutable state for 60fps touch handling without re-renders
  const state = useRef({
    scale: 1,
    x: 0,
    y: 0,
    startX: 0,
    startY: 0,
    isPanning: false,
    startDist: 0,
    initialScale: 1,
    pinchMidX: 0,   // midpoint of pinch gesture in screen coords
    pinchMidY: 0,
    xAtPinchStart: 0,  // x/y at start of pinch (for origin-based calc)
    yAtPinchStart: 0
  })

  const lastTap = useRef(0)
  const wrapperRef = useRef<HTMLDivElement>(null) // outer wrapper for dimensions

  // Direct DOM transform for 60fps smoothness
  const applyTransform = (smooth = false) => {
    if (containerRef.current) {
      containerRef.current.style.transition = smooth ? 'transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none'
      containerRef.current.style.transform = `translate3d(${state.current.x}px, ${state.current.y}px, 0) scale(${state.current.scale})`
    }
  }

  useEffect(() => {
    state.current = { scale: 1, x: 0, y: 0, startX: 0, startY: 0, isPanning: false, startDist: 0, initialScale: 1, pinchMidX: 0, pinchMidY: 0, xAtPinchStart: 0, yAtPinchStart: 0 }
    applyTransform(false)
  }, [currentIndex])

  const getDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      state.current.isPanning = true
      state.current.startX = e.touches[0].clientX - state.current.x
      state.current.startY = e.touches[0].clientY - state.current.y
    } else if (e.touches.length === 2) {
      state.current.isPanning = false
      state.current.startDist = getDistance(e.touches)
      state.current.initialScale = state.current.scale

      // Calculate midpoint between fingers in container's local space
      const rect = wrapperRef.current?.getBoundingClientRect()
      if (rect) {
        const midScreenX = (e.touches[0].clientX + e.touches[1].clientX) / 2
        const midScreenY = (e.touches[0].clientY + e.touches[1].clientY) / 2
        // Convert midpoint from screen to container-local coordinates
        state.current.pinchMidX = midScreenX - rect.left - rect.width / 2
        state.current.pinchMidY = midScreenY - rect.top - rect.height / 2
        state.current.xAtPinchStart = state.current.x
        state.current.yAtPinchStart = state.current.y
      }
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && state.current.isPanning) {
      const currX = e.touches[0].clientX
      const currY = e.touches[0].clientY
      state.current.x = currX - state.current.startX

      if (state.current.scale === 1) {
        // When not zoomed, allow vertical dragging for swipe-to-close
        state.current.y = currY - state.current.startY
      } else {
        state.current.y = currY - state.current.startY
      }
      applyTransform(false)
    } else if (e.touches.length === 2) {
      const newDist = getDistance(e.touches)
      const ratio = newDist / state.current.startDist
      const newScale = Math.min(Math.max(1, state.current.initialScale * ratio), 5)

      // Zoom towards the pinch midpoint
      const scaleDelta = newScale - state.current.initialScale
      state.current.x = state.current.xAtPinchStart - scaleDelta * state.current.pinchMidX
      state.current.y = state.current.yAtPinchStart - scaleDelta * state.current.pinchMidY
      state.current.scale = newScale
      applyTransform(false)
    }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    state.current.isPanning = false
    const now = Date.now()

    if (e.changedTouches.length === 1 && state.current.startDist === 0) {
      // Double tap check
      if (now - lastTap.current < 300) {
        const rect = wrapperRef.current?.getBoundingClientRect()
        if (state.current.scale > 1) {
          state.current.scale = 1
          state.current.x = 0
          state.current.y = 0
        } else if (rect) {
          // Zoom into the tapped position
          const tapX = e.changedTouches[0].clientX - rect.left - rect.width / 2
          const tapY = e.changedTouches[0].clientY - rect.top - rect.height / 2
          state.current.scale = 2.5
          state.current.x = -tapX * (2.5 - 1)
          state.current.y = -tapY * (2.5 - 1)
        }
        applyTransform(true)
        lastTap.current = 0
        return
      }
      lastTap.current = now
    }
    state.current.startDist = 0

    if (state.current.scale === 1) {
      // Swipe down to close
      if (state.current.y > 100) {
        onClose()
        return
      }
      // Swipe left/right navigation
      if (state.current.x < -60 && currentIndex < images.length - 1) {
        setCurrentIndex(i => i + 1)
      } else if (state.current.x > 60 && currentIndex > 0) {
        setCurrentIndex(i => i - 1)
      } else {
        state.current.x = 0
        state.current.y = 0
        applyTransform(true)
      }
    } else {
      applyTransform(true)
    }
  }

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentIndex < images.length - 1) setCurrentIndex(i => i + 1)
  }
  
  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (currentIndex > 0) setCurrentIndex(i => i - 1)
  }

  const handleWheel = (e: React.WheelEvent) => {
    const delta = e.deltaY * -0.01
    state.current.scale = Math.min(Math.max(1, state.current.scale + delta), 5)
    if (state.current.scale === 1) {
      state.current.x = 0
      state.current.y = 0
    }
    applyTransform(true)
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/95 touch-none">
      <button 
        type="button"
        className="absolute top-4 left-4 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors z-[310]"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>

      {images.length > 1 && (
        <div className="absolute top-6 flex space-x-2 z-[310]">
          {images.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === currentIndex ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      )}

      {images.length > 1 && currentIndex > 0 && (
        <button className="absolute left-4 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white z-[310] hidden md:block" onClick={handlePrev}>
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      <div 
        ref={wrapperRef}
        className="w-full h-full overflow-hidden flex items-center justify-center cursor-move"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={handleWheel}
        onClick={() => {
          if (state.current.scale === 1 && state.current.x === 0 && state.current.y === 0) onClose()
        }}
      >
        <div ref={containerRef} className="will-change-transform flex items-center justify-center w-full h-full">
          <img 
            src={images[currentIndex]} 
            alt="Enlarged view" 
            className="max-w-full max-h-[85vh] object-contain select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </div>

      {images.length > 1 && currentIndex < images.length - 1 && (
        <button className="absolute right-4 p-3 bg-black/50 hover:bg-black/80 rounded-full text-white z-[310] hidden md:block" onClick={handleNext}>
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

    </div>,
    document.body
  )
}

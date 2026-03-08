'use client'

import { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'
import { getCroppedImg } from '@/lib/crop-image'
import { X, Check } from 'lucide-react'

type Area = {
  width: number
  height: number
  x: number
  y: number
}

interface ImageCropperModalProps {
  imageSrc: string
  onCropComplete: (croppedBlob: Blob) => void
  onCancel: () => void
}

export function ImageCropperModal({ imageSrc, onCropComplete, onCancel }: ImageCropperModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return

    try {
      setIsProcessing(true)
      const croppedImageBlob = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        0
      )
      if (croppedImageBlob) {
        onCropComplete(croppedImageBlob)
      }
    } catch (e) {
      console.error(e)
      alert('画像の切り取りに失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!mounted) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-xl animate-fade-in">
      <div className="flex items-center justify-between p-4 z-10 glass border-b border-white/10">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm">位置とサイズを調整</span>
        <button
          onClick={handleSave}
          disabled={isProcessing}
          className="p-2 -mr-2 rounded-full bg-purple-500 hover:bg-purple-400 text-white transition-colors disabled:opacity-50"
        >
          {isProcessing ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Check className="w-5 h-5" />
          )}
        </button>
      </div>

      <div className="flex-1 relative w-full h-full">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
          initialCroppedAreaPercentages={{
            width: 80,
            height: 80,
            x: 10,
            y: 10
          }}
          style={{
            containerStyle: {
              background: 'transparent',
            },
            cropAreaStyle: {
              border: '2px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.7)'
            }
          }}
        />
      </div>

      <div className="p-8 pb-12 z-10 glass border-t border-white/10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <span className="text-sm font-bold text-gray-400 shrink-0">縮小</span>
          <input
            type="range"
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            aria-labelledby="Zoom"
            onChange={(e) => {
              setZoom(Number(e.target.value))
            }}
            className="w-full accent-purple-500 h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
          />
          <span className="text-sm font-bold text-gray-400 shrink-0">拡大</span>
        </div>
      </div>
    </div>,
    document.body
  )
}

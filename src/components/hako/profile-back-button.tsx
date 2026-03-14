'use client'

import { useRouter, useParams } from 'next/navigation'
import { X } from 'lucide-react'

export function ProfileBackButton() {
  const router = useRouter()
  const params = useParams()
  const hakoId = params?.hakoId

  const handleClose = () => {
    const lastHub = localStorage.getItem(`hako_${hakoId}_last_hub`)
    if (lastHub) {
      router.push(lastHub)
    } else {
      router.push(`/hako/${hakoId}`)
    }
  }

  return (
    <button
      onClick={handleClose}
      className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6 font-bold group"
    >
      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
        <X className="w-4 h-4" />
      </div>
      閉じる
    </button>
  )
}

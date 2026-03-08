'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyInviteLinkProps {
  joinLink: string
}

export function CopyInviteLink({ joinLink }: CopyInviteLinkProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div className="relative z-10 w-full min-w-0">
      <div className="bg-black/80 border border-white/10 rounded-xl p-3 flex items-center justify-between group w-full min-w-0">
        <div className="flex-1 min-w-0 mr-3">
          <span className="text-sm text-gray-300 font-mono block truncate w-full">
            {joinLink}
          </span>
        </div>
        <button 
          onClick={handleCopy}
          className="p-2 bg-white/10 hover:bg-purple-500/50 hover:text-white rounded-lg transition-all text-gray-400 shrink-0"
          title="URLをコピー"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

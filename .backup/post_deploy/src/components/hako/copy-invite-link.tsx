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
    <div className="relative z-10 w-full min-w-0 font-sans">
      <div className="theme-elevated border theme-border rounded-xl p-3 flex items-center justify-between group w-full min-w-0">
        <div className="flex-1 min-w-0 mr-3">
          <span className="text-sm theme-muted font-mono block truncate w-full">
            {joinLink}
          </span>
        </div>
        <button 
          onClick={handleCopy}
          className="p-2 theme-elevated hover:bg-purple-500/50 hover:text-white rounded-lg border theme-border transition-all theme-muted shrink-0 shadow-sm"
          title="URLをコピー"
        >
          {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

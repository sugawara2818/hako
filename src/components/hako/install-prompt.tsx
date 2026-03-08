'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare } from 'lucide-react'

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if the user is on an iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // Check if the app is already running in standalone mode (installed)
    const isInStandaloneMode = ('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(isInStandaloneMode)

    // Check if the user has dismissed the prompt recently
    const hasSeenPrompt = localStorage.getItem('hako_install_prompt_dismissed')

    // Only show the prompt if it's iOS (Safari), not already installed, and hasn't been dismissed recently
    // Native Android PWA prompts are usually handled automatically by Chrome, but we can show this to everyone if needed.
    // For now, we target iOS since Safari doesn't have a reliable automatic prompt.
    if (isIosDevice && !isInStandaloneMode && !hasSeenPrompt) {
      // Delay showing the prompt slightly so it's not too aggressive on load
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    // Set expiry for 7 days
    const expiry = new Date().getTime() + 7 * 24 * 60 * 60 * 1000
    localStorage.setItem('hako_install_prompt_dismissed', expiry.toString())
  }

  // Also check if the dismissed flag has expired
  useEffect(() => {
      const expiryStr = localStorage.getItem('hako_install_prompt_dismissed')
      if (expiryStr) {
          const expiryDay = parseInt(expiryStr, 10)
          if (new Date().getTime() > expiryDay) {
              localStorage.removeItem('hako_install_prompt_dismissed')
          }
      }
  }, [])

  if (!isVisible || isStandalone) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-[100] animate-fade-in sm:hidden">
      <div className="glass p-4 rounded-2xl border border-purple-500/30 flex items-start gap-3 shadow-2xl relative overflow-hidden bg-black/80 backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px] pointer-events-none" />
        
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-white shrink-0 shadow-lg mt-1">
          H
        </div>
        
        <div className="flex-1 pr-6 relative z-10">
          <h3 className="font-bold text-sm mb-1 text-white">アプリとして追加</h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            この箱をホーム画面に追加すると、フルスクリーンでアプリのように快適に使えます。
          </p>
          
          {isIOS && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 p-2 rounded-lg">
              <Share className="w-3.5 h-3.5 text-blue-400" /> 
              <span>をタップして</span>
              <PlusSquare className="w-3.5 h-3.5 text-gray-300" />
              <span>ホーム画面に追加</span>
            </div>
          )}
        </div>

        <button 
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

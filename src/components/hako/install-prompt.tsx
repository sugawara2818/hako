'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare } from 'lucide-react'

export function InstallPrompt() {
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Check if the user is on an iOS or Android device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)
    setIsIOS(isIosDevice)
    setIsAndroid(isAndroidDevice)

    // Check if the app is already running in standalone mode (installed)
    const isInStandaloneMode = ('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(isInStandaloneMode)

    // Listen for the beforeinstallprompt event (Chrome/Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      // Optionally, send analytics event that PWA install promo was shown.
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // Check if the user has dismissed the prompt recently
    const hasSeenPrompt = localStorage.getItem('hako_install_prompt_dismissed')

    // Only show the prompt if it's a mobile device, not already installed, and hasn't been dismissed recently.
    if ((isIosDevice || isAndroidDevice) && !isInStandaloneMode && !hasSeenPrompt) {
      // Delay showing the prompt slightly so it's not too aggressive on load
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 3000)
      
      return () => {
        clearTimeout(timer)
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null)
    
    if (outcome === 'accepted') {
      setIsVisible(false) // Hide our custom ui
    }
  }

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
          
          {isIOS ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 p-2 rounded-lg">
              <Share className="w-3.5 h-3.5 text-blue-400" /> 
              <span>をタップして</span>
              <PlusSquare className="w-3.5 h-3.5 text-gray-300" />
              <span>ホーム画面に追加</span>
            </div>
          ) : deferredPrompt ? (
            <button 
              onClick={handleInstallClick}
              className="mt-3 w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white text-xs font-bold rounded-lg transition-all shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2"
            >
              <PlusSquare className="w-4 h-4" />
              アプリをインストール
            </button>
          ) : isAndroid ? (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-gray-400 bg-white/5 p-2 rounded-lg">
              <span className="font-bold text-gray-300">︙</span>
              <span>メニューから</span>
              <PlusSquare className="w-3.5 h-3.5 text-gray-300" />
              <span>ホーム画面に追加</span>
            </div>
          ) : null}
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

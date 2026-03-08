'use client'

import { useState, useEffect } from 'react'
import { PlusSquare, Download } from 'lucide-react'

// Modal component for iOS instructions
function IOSInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="glass w-full max-w-sm rounded-[24px] p-6 relative overflow-hidden bg-black/80 border-purple-500/30">
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[40px] pointer-events-none" />
        
        <h3 className="font-bold text-lg mb-2 text-white">アプリとして追加</h3>
        <p className="text-sm text-gray-300 leading-relaxed mb-6">
          Safariの制限により、手動での追加が必要です。以下の手順でフルスクリーンアプリとして追加できます。
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
              <span className="text-blue-400 font-bold">1</span>
            </div>
            <p className="text-sm text-gray-300">画面下部の<span className="text-blue-400 font-bold mx-1">共有アイコン</span>をタップ</p>
          </div>
          
          <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/5">
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0">
              <span className="text-purple-400 font-bold">2</span>
            </div>
            <p className="text-sm text-gray-300">メニューから<span className="text-white font-bold mx-1">ホーム画面に追加</span>を選択</p>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  )
}

interface InstallButtonProps {
  variant?: 'sidebar' | 'icon'
}

export function InstallButton({ variant = 'sidebar' }: InstallButtonProps) {
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Check if the user is on an iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(isIosDevice)

    // Check if the app is already running in standalone mode (installed)
    const isInStandaloneMode = ('standalone' in window.navigator && (window.navigator as any).standalone) || window.matchMedia('(display-mode: standalone)').matches
    setIsStandalone(isInStandaloneMode)

    // Listen for the beforeinstallprompt event (Chrome/Android/Desktop)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true)
      return
    }

    if (!deferredPrompt) return

    // Show the native install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice
    
    // Discard the prompt
    setDeferredPrompt(null)
    
    if (outcome === 'accepted') {
       // Optional: force hide button by setting pretend-standalone
       setIsStandalone(true) 
    }
  }

  // Hide entirely if already installed or not running in a browser environment yet
  if (!isMounted || isStandalone) return null
  
  // On Desktop/Android, if it doesn't fire beforeinstallprompt (e.g., Firefox, or unsupported), hide it unless it's iOS which needs manual flow
  if (!isIOS && !deferredPrompt) return null

  if (variant === 'icon') {
    return (
      <>
        <button 
          onClick={handleInstallClick}
          className="p-2 text-pink-400 hover:bg-pink-500/10 rounded-xl transition-colors relative group"
          title="アプリをインストール"
        >
          <div className="absolute inset-0 bg-pink-500/20 blur-md rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          <Download className="w-5 h-5 relative z-10" />
        </button>
        {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
      </>
    )
  }

  return (
    <>
      <button 
        onClick={handleInstallClick}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 hover:from-purple-500/20 hover:to-pink-500/20 text-white transition-all group overflow-hidden relative"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-8 h-8 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shadow-inner">
            <Download className="w-4 h-4 text-pink-400" />
          </div>
          <span className="font-semibold text-sm">アプリ追加</span>
        </div>
        <PlusSquare className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors relative z-10" />
      </button>

      {showIOSModal && <IOSInstallModal onClose={() => setShowIOSModal(false)} />}
    </>
  )
}

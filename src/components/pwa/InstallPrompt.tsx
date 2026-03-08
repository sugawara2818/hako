'use client'

import { useState, useEffect } from 'react'
import { PlusSquare, X } from 'lucide-react'

export function InstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')

  useEffect(() => {
    // Basic detection for iOS or Android
    const userAgent = window.navigator.userAgent.toLowerCase()
    
    // Check if the app is already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone || 
                         document.referrer.includes('android-app://')

    if (isStandalone) {
      return // Already installed
    }

    if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform('ios')
    } else if (/android/.test(userAgent)) {
      setPlatform('android')
    }

    // Show prompt after a short delay so it doesn't block immediate rendering
    if (/iphone|ipad|ipod|android/.test(userAgent)) {
        const timer = setTimeout(() => setShowPrompt(true), 3000)
        return () => clearTimeout(timer)
    }
  }, [])

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 z-50 animate-fade-in sm:hidden">
      <div className="glass p-4 rounded-2xl border border-white/10 shadow-2xl shadow-black relative flex items-start gap-4">
        
        <button 
          onClick={() => setShowPrompt(false)}
          className="absolute top-2 right-2 p-1.5 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0 shadow-lg mt-1">
          <span className="font-bold text-white text-lg">H</span>
        </div>

        <div className="flex-1 pr-4">
          <h3 className="font-bold text-white text-sm mb-1">アプリとして追加</h3>
          <p className="text-gray-400 text-xs leading-relaxed">
            {platform === 'ios' && 'シェアボタン[↑]から「ホーム画面に追加」を選択すると、より快適にご利用いただけます。'}
            {platform === 'android' && 'メニューから「ホーム画面に追加」を選択すると、アプリのように使えます。'}
            {platform === 'other' && 'ホーム画面に追加してアプリとしてご利用ください。'}
          </p>
        </div>

      </div>
      
      {/* iOS specific visual pointer (mock arrow pointing down) */}
      {platform === 'ios' && (
         <div className="flex justify-center mt-2 animate-bounce">
             <div className="w-0 h-0 border-l-[8px] border-l-transparent border-t-[8px] border-t-white/30 border-r-[8px] border-r-transparent" />
         </div>
      )}
    </div>
  )
}

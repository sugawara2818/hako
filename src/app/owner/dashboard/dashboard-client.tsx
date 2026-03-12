'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Hash, ArrowRight, Settings, ChevronUp, ChevronDown } from 'lucide-react'
import { getHakoGradient } from '@/lib/hako-utils'
import { reorderHakos } from '@/core/hako/actions'

interface Hako {
  id: string
  name: string
  created_at: string
  icon_url: string | null
  icon_color: string | null
  sort_order: number
}

interface DashboardClientProps {
  initialHakos: Hako[]
}

export function DashboardClient({ initialHakos }: DashboardClientProps) {
  const [hakos, setHakos] = useState(initialHakos)
  const [isSaving, setIsSaving] = useState(false)

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (isSaving) return
    
    const newHakos = [...hakos]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    
    if (targetIndex < 0 || targetIndex >= hakos.length) return

    // Swap
    const temp = newHakos[index]
    newHakos[index] = newHakos[targetIndex]
    newHakos[targetIndex] = temp

    setHakos(newHakos)
    setIsSaving(true)

    try {
      const hakoIds = newHakos.map(h => h.id)
      await reorderHakos(hakoIds)
    } catch (err) {
      console.error(err)
      alert('並び替えの保存に失敗しました')
      setHakos(hakos) // Rollback
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {hakos.map((hako, index) => (
        <div key={hako.id} className="theme-elevated p-6 rounded-3xl border theme-border hover:border-purple-500/30 transition-all group relative overflow-hidden flex flex-col h-full animate-fade-in shadow-sm">
          {/* decorative background glow */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] group-hover:bg-purple-500/20 transition-all" />

          {/* Reorder Controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-1 z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => handleMove(index, 'up')}
              disabled={index === 0 || isSaving}
              className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-purple-500/20"
              title="上へ"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button 
              onClick={() => handleMove(index, 'down')}
              disabled={index === hakos.length - 1 || isSaving}
              className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 disabled:opacity-20 disabled:cursor-not-allowed transition-all border border-purple-500/20"
              title="下へ"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6 relative z-10 pr-10">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg border border-white/5 shadow-inner shrink-0 overflow-hidden ${!hako.icon_url ? `bg-gradient-to-br ${getHakoGradient(hako.icon_color)}` : ''}`}>
              {hako.icon_url ? (
                <Image 
                  src={hako.icon_url} 
                  alt="" 
                  width={48} 
                  height={48} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-white">{hako.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h2 className="text-xl font-bold theme-text truncate">{hako.name}</h2>
              <p className="theme-muted text-xs font-mono">{new Date(hako.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="mt-auto space-y-3 relative z-10 pt-6">
            <Link
              href={`/hako/${hako.id}`}
              className="flex items-center justify-between w-full p-3 rounded-xl bg-purple-500/5 hover:bg-purple-500/10 theme-text border theme-border transition-colors group/btn shadow-sm"
            >
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 theme-muted group-hover/btn:text-purple-500 transition-colors" />
                <span className="text-sm font-medium">箱を開く (アプリ)</span>
              </div>
              <ArrowRight className="w-4 h-4 theme-muted group-hover/btn:text-purple-500 transition-colors group-hover/btn:translate-x-1" />
            </Link>

            <Link
              href={`/owner/hako/${hako.id}`}
              className="flex items-center justify-between w-full p-3 rounded-xl hover:theme-elevated theme-muted hover:theme-text transition-colors group/btn"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm">管理画面設定</span>
              </div>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}

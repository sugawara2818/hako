'use client'

import React, { useState } from 'react'
import { ChevronLeft, Calendar, Unlock, Lock, Trash2, Edit2, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { deleteDiaryEntry } from '@/core/diary/actions'
import { useRouter } from 'next/navigation'

interface DiaryDetailProps {
  hakoId: string
  currentUserId: string
  entry: any
}

export function DiaryDetail({ hakoId, currentUserId, entry }: DiaryDetailProps) {
  const router = useRouter()
  const isAuthor = entry.user_id === currentUserId
  const date = new Date(entry.diary_date)
  const formattedDate = format(date, 'yyyy年MM月dd日 (E)', { locale: ja })
  const displayName = entry.hako_members[0]?.display_name || 'Anonymous'
  
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!confirm('この日記を削除しますか？')) return
    setIsDeleting(true)
    try {
      await deleteDiaryEntry(entry.id, hakoId)
      router.push(`/hako/${hakoId}/diary`)
      router.refresh()
    } catch (err) {
      alert('削除に失敗しました')
      setIsDeleting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-10">
        <Link href={`/hako/${hakoId}/diary`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors font-bold">
          <ChevronLeft className="w-4 h-4" /> 日記一覧
        </Link>
        
        {isAuthor && (
          <div className="flex items-center gap-2">
            <Link 
              href={`/hako/${hakoId}/diary/edit/${entry.id}`}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all text-xs font-bold"
            >
              <Edit2 className="w-3.5 h-3.5" /> 編集
            </Link>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-2xl transition-all text-xs font-bold disabled:opacity-50"
            >
              {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              削除
            </button>
          </div>
        )}
      </div>

      <header className="mb-12">
        <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-950 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
               {entry.profiles?.avatar_url ? (
                 <img src={entry.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-6 h-6 text-gray-500" />
               )}
            </div>
            <div>
              <p className="font-black text-lg text-white/90 leading-none mb-2">{displayName}</p>
              <div className="flex items-center gap-3 text-xs text-gray-500 font-bold">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {formattedDate}
                </span>
                <span className="text-gray-800 text-lg leading-none">/</span>
                {entry.is_public ? (
                  <span className="flex items-center gap-1.5 text-blue-400/80">
                    <Unlock className="w-3.5 h-3.5" /> 公開日記
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 text-orange-400/80">
                    <Lock className="w-3.5 h-3.5" /> 非公開日記
                  </span>
                )}
              </div>
            </div>
        </div>

        {entry.title && (
          <h1 className="text-3xl md:text-5xl font-black text-white leading-[1.15] mb-4">
             {entry.title}
          </h1>
        )}
      </header>

      <div className="prose prose-invert prose-lg max-w-none">
        <p className="text-gray-300 leading-relaxed whitespace-pre-wrap text-lg md:text-xl font-medium">
          {entry.content}
        </p>
      </div>

      <footer className="mt-20 pt-10 border-t border-white/5">
         <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest text-center">
            記入日: {format(new Date(entry.created_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
         </p>
      </footer>
    </div>
  )
}

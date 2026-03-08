'use client'

import React from 'react'
import { BookOpen, Calendar, Lock, Unlock, Trash2, Edit2, ChevronRight, User } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DiaryEntry {
  id: string
  hako_id: string
  user_id: string
  title: string | null
  content: string
  diary_date: string
  is_public: boolean
  created_at: string
  profiles: {
    display_name: string | null
    avatar_url: string | null
  }
  hako_members: {
    display_name: string | null
  }[]
}

interface DiaryFeedProps {
  hakoId: string
  currentUserId: string
  entries: DiaryEntry[]
  onDelete: (id: string) => Promise<void>
}

export function DiaryFeed({ hakoId, currentUserId, entries, onDelete }: DiaryFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
          <BookOpen className="w-8 h-8 text-gray-500" />
        </div>
        <p className="text-gray-400 font-medium">まだ日記がありません</p>
        <p className="text-gray-500 text-sm mt-1">最初の一歩を書き残しましょう</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {entries.map((entry) => (
        <DiaryItem 
          key={entry.id} 
          entry={entry} 
          isAuthor={entry.user_id === currentUserId} 
          hakoId={hakoId}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function DiaryItem({ entry, isAuthor, hakoId, onDelete }: { entry: DiaryEntry, isAuthor: boolean, hakoId: string, onDelete: (id: string) => Promise<void> }) {
  const date = new Date(entry.diary_date)
  const formattedDate = format(date, 'yyyy年MM月dd日 (E)', { locale: ja })
  const displayName = entry.hako_members[0]?.display_name || 'Anonymous'

  return (
    <div className="group relative bg-[#111] border border-white/5 rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300">
      <Link href={`/hako/${hakoId}/diary/${entry.id}`} className="block p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-950 border border-white/10 flex items-center justify-center overflow-hidden shrink-0">
               {entry.profiles?.avatar_url ? (
                 <img src={entry.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
               ) : (
                 <User className="w-5 h-5 text-gray-500" />
               )}
            </div>
            <div>
              <p className="font-bold text-sm text-white/90">{displayName}</p>
              <div className="flex items-center gap-2 text-[11px] text-gray-500 font-medium mt-0.5">
                <Calendar className="w-3.5 h-3.5" />
                {formattedDate}
                <span className="text-gray-700">•</span>
                {entry.is_public ? (
                  <span className="flex items-center gap-1 text-blue-400/80">
                    <Unlock className="w-3 h-3" /> 公開
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-orange-400/80">
                    <Lock className="w-3 h-3" /> 非公開
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAuthor && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Link 
                  href={`/hako/${hakoId}/diary/edit/${entry.id}`}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (confirm('この日記を削除しますか？')) onDelete(entry.id)
                  }}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-gray-500 transition-colors" />
          </div>
        </div>

        {entry.title && (
          <h3 className="text-xl font-bold text-white mb-2 leading-tight">
            {entry.title}
          </h3>
        )}

        <p className="text-gray-400 text-sm leading-relaxed line-clamp-3">
          {entry.content}
        </p>
      </Link>
    </div>
  )
}

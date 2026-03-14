'use client'

import React, { useState, useMemo } from 'react'
import { BookOpen, Calendar, Lock, Unlock, Trash2, Edit2, ChevronRight, User, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Image from 'next/image'
import { ProfileDiaryCalendar } from './ProfileDiaryCalendar'

interface DiaryEntry {
  id: string
  hako_id: string
  user_id: string
  title: string | null
  content: string
  diary_date: string
  is_public: boolean
  created_at: string
  profiles?: {
    display_name: string | null
    avatar_url: string | null
  }
  hako_members?: {
    display_name: string | null
  }[]
}

interface DiaryFeedProps {
  hakoId: string
  currentUserId: string
  entries: DiaryEntry[]
  onDelete?: (id: string) => void | Promise<void>
  isProfileView?: boolean
}

// ──────────────────────────────────────────────────
// Custom confirm dialog component
// ──────────────────────────────────────────────────
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
  confirmLabel = '削除する',
  danger = true,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  danger?: boolean
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      {/* Dialog card */}
      <div className="relative w-full max-w-[320px] bg-[#1a1a1a] border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-base text-gray-200 leading-relaxed mb-6 text-center font-medium">{message}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onConfirm}
            className={`w-full py-4 rounded-2xl text-sm font-black transition-all active:scale-95 ${
              danger
                ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20'
                : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-500/20'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 rounded-2xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 text-sm font-bold transition-all"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
// ──────────────────────────────────────────────────

export function DiaryFeed({ hakoId, currentUserId, entries, onDelete, isProfileView }: DiaryFeedProps) {
  const [sortMode, setSortMode] = useState<'date_desc' | 'date_asc' | 'created_desc' | 'created_asc'>('date_desc')
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [confirmState, setConfirmState] = useState<{
    id: string
    message: string
  } | null>(null)

  const showConfirm = (id: string, message: string) => {
    setConfirmState({ id, message })
  }

  const handleConfirmDelete = async () => {
    if (!confirmState) return
    const id = confirmState.id
    setConfirmState(null)
    if (onDelete) {
      await onDelete(id)
    }
  }

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (sortMode === 'date_desc') {
        const diff = new Date(b.diary_date).getTime() - new Date(a.diary_date).getTime()
        return diff !== 0 ? diff : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortMode === 'date_asc') {
        const diff = new Date(a.diary_date).getTime() - new Date(b.diary_date).getTime()
        return diff !== 0 ? diff : new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      if (sortMode === 'created_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
      if (sortMode === 'created_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      }
      return 0
    })
  }, [entries, sortMode])

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
    <div className="space-y-4 max-w-2xl mx-auto relative w-full">
      <div className="flex items-center justify-between mb-4 animate-fade-in px-4 sm:px-0">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border theme-border">
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'theme-muted hover:theme-text'}`}
            title="リスト表示"
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-2 rounded-xl transition-all ${viewMode === 'calendar' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20' : 'theme-muted hover:theme-text'}`}
            title="カレンダー表示"
          >
            <Calendar className="w-5 h-5" />
          </button>
        </div>

        <div className="relative">
          <select 
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
            className="appearance-none theme-surface border border-white/10 theme-text text-sm font-bold rounded-xl pl-4 pr-10 py-2.5 outline-none focus:border-purple-500/50 hover:bg-white/5 transition-all w-full md:w-auto"
          >
            <option value="date_desc">新しい順 (日付)</option>
            <option value="date_asc">古い順 (日付)</option>
            <option value="created_desc">新しい順 (投稿日)</option>
            <option value="created_asc">古い順 (投稿日)</option>
          </select>
          <ArrowUpDown className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {confirmState && (
        <ConfirmDialog
          message={confirmState.message}
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmState(null)}
        />
      )}

      {viewMode === 'calendar' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <ProfileDiaryCalendar entries={entries} hakoId={hakoId} userId={currentUserId} />
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {sortedEntries.map((entry) => (
            <DiaryItem 
              key={entry.id} 
              entry={entry} 
              isAuthor={entry.user_id === currentUserId} 
              hakoId={hakoId}
              onDelete={() => showConfirm(entry.id, 'この日記を削除しますか？')}
              isProfileView={isProfileView}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function DiaryItem({ entry, isAuthor, hakoId, onDelete, isProfileView }: { entry: DiaryEntry, isAuthor: boolean, hakoId: string, onDelete: (id: string) => void | Promise<void>, isProfileView?: boolean }) {
  const date = new Date(entry.diary_date)
  const formattedDate = format(date, 'yyyy年MM月dd日 (E)', { locale: ja })
  
  // Robust display name resolution: Hako-specific name > Profile global name > Default
  const displayName = entry.hako_members?.[0]?.display_name || entry.profiles?.display_name || 'ユーザー'

  return (
    <div className="group relative theme-surface border theme-border rounded-3xl overflow-hidden hover:border-white/10 transition-all duration-300">
      <Link href={`/hako/${hakoId}/diary/${entry.id}${isProfileView ? `?from=profile&userId=${entry.user_id}` : ''}`} className="block p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Link href={`/hako/${hakoId}/user/${entry.user_id}`} className="group/avatar shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-gray-950 border border-white/10 flex items-center justify-center overflow-hidden transition-transform group-hover/avatar:scale-105">
                 {entry.profiles?.avatar_url ? (
                   <Image 
                     src={entry.profiles.avatar_url} 
                     alt="" 
                     width={40} 
                     height={40} 
                     className="w-full h-full object-cover" 
                   />
                 ) : (
                   <div className="w-full h-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                     {entry.profiles?.display_name?.charAt(0) || '?'}
                   </div>
                 )}
              </div>
            </Link>
            <div>
              <Link href={`/hako/${hakoId}/user/${entry.user_id}`} className="font-bold text-sm theme-text opacity-90 hover:underline">
                {displayName}
              </Link>
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

          <div className="flex gap-2">
            {isAuthor && (
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <Link 
                  href={`/hako/${hakoId}/diary/edit/${entry.id}`}
                  className="p-2.5 md:p-2 text-gray-400 bg-white/5 md:bg-transparent hover:theme-text hover:bg-white/10 rounded-full transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit2 className="w-4 h-4" />
                </Link>
                <button 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    onDelete(entry.id)
                  }}
                  className="p-2.5 md:p-2 text-gray-400 bg-white/5 md:bg-transparent hover:text-red-400 hover:bg-red-500/10 rounded-full transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-center p-2">
              <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 transition-colors" />
            </div>
          </div>
        </div>

        {entry.title && (
          <h3 className="text-xl font-bold theme-text mb-2 leading-tight text-white dark:text-inherit">
            {entry.title}
          </h3>
        )}

        <p className="theme-text opacity-70 text-sm leading-relaxed line-clamp-3">
          {entry.content}
        </p>
      </Link>
    </div>
  )
}

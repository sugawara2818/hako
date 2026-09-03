'use client'

import React, { useState } from 'react'
import { ChevronLeft, Calendar, Unlock, Lock, Trash2, Edit2, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import Image from 'next/image'
import { deleteDiaryEntry } from '@/core/diary/actions'
import { useRouter, useSearchParams } from 'next/navigation'

interface DiaryDetailProps {
  hakoId: string
  currentUserId: string
  entry: any
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
      <div className="relative w-full max-w-[320px] theme-surface border border-white/10 rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <p className="text-base theme-text opacity-90 leading-relaxed mb-6 text-center font-medium">{message}</p>
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
            className="w-full py-4 rounded-2xl border border-white/10 theme-muted hover:theme-text hover:bg-white/5 text-sm font-bold transition-all"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
// ──────────────────────────────────────────────────

export function DiaryDetail({ hakoId, currentUserId, entry }: DiaryDetailProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const referralUserId = searchParams.get('userId')
  
  const isAuthor = entry.user_id === currentUserId
  
  const formatDateSafe = (dateStr: string, formatStr: string) => {
    try {
      if (!dateStr) return '---'
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return '---'
      return format(d, formatStr, { locale: ja })
    } catch {
      return '---'
    }
  }

  const formattedDate = formatDateSafe(entry.diary_date, 'yyyy年MM月dd日 (E)')
  const formattedCreatedAt = formatDateSafe(entry.created_at, 'yyyy/MM/dd HH:mm')
  
  // Robust display name resolution: Hako-specific name > Profile global name > Default
  const displayName = entry.hako_members?.[0]?.display_name || entry.profiles?.display_name || 'ユーザー'
  
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setShowConfirm(false)
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

  const getBackLink = () => {
    if (from === 'profile' && referralUserId) {
      return `/hako/${hakoId}/user/${referralUserId}?tab=diary`
    }
    const diaryDate = searchParams.get('date')
    if (from === 'list' && diaryDate) {
      return `/hako/${hakoId}/diary?view=list&date=${diaryDate}`
    }
    return `/hako/${hakoId}/diary`
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in relative">
      {showConfirm && (
        <ConfirmDialog
          message="この日記を削除しますか？"
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
      <div className="flex items-center justify-between mb-10">
        <Link 
          href={getBackLink()} 
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:theme-text transition-colors font-bold"
        >
          <ChevronLeft className="w-4 h-4" /> {from === 'profile' ? 'プロフィールへ戻る' : '日記一覧へ戻る'}
        </Link>
        
        {isAuthor && (
          <div className="flex items-center gap-2">
            <Link 
              href={`/hako/${hakoId}/diary/edit/${entry.id}${
                from === 'profile' && referralUserId
                  ? `?from=profile&userId=${referralUserId}&source=detail`
                  : from === 'list' && searchParams.get('date')
                    ? `?from=list&date=${searchParams.get('date')}&source=detail`
                    : from ? `?from=${from}&source=detail` : '?source=detail'
              }`}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 theme-text rounded-2xl transition-all text-xs font-bold"
            >
              <Edit2 className="w-3.5 h-3.5" /> 編集
            </Link>
            <button 
              onClick={() => setShowConfirm(true)}
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
                 <Image 
                   src={entry.profiles.avatar_url} 
                   alt="" 
                   width={56} 
                   height={56} 
                   className="w-full h-full object-cover" 
                 />
               ) : (
                 <User className="w-6 h-6 text-gray-500" />
               )}
            </div>
            <div>
              <p className="font-black text-xl theme-text leading-tight mb-1">{displayName}</p>
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
          <h1 className="text-3xl md:text-5xl font-black theme-text leading-[1.15] mb-4">
             {entry.title}
          </h1>
        )}
      </header>

      <div className="prose prose-invert prose-lg max-w-none">
        <p className="theme-text opacity-90 leading-relaxed whitespace-pre-wrap text-lg md:text-xl font-medium">
          {entry.content}
        </p>
      </div>

      <footer className="mt-20 pt-10 border-t border-white/5">
         <p className="text-[10px] font-black text-gray-700 uppercase tracking-widest text-center">
            記入日: {formattedCreatedAt}
         </p>
      </footer>
    </div>
  )
}

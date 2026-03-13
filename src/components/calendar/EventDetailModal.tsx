'use client'

import React, { useEffect } from 'react'
import { X, Clock, AlignLeft, User as UserIcon, Calendar, Edit2, Trash2, MapPin } from 'lucide-react'
import { format, parseISO, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarEvent } from '@/core/calendar/actions'

interface EventDetailModalProps {
  isOpen: boolean
  onClose: () => void
  event: CalendarEvent | null
  currentUserId: string
  onEdit: (event: CalendarEvent) => void
  onDelete: (event: CalendarEvent) => void
}

export function EventDetailModal({ isOpen, onClose, event, currentUserId, onEdit, onDelete }: EventDetailModalProps) {
  // Scroll lock effect
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!isOpen || !event) return null

  const isOwner = event.user_id === currentUserId
  const startDate = parseISO(event.start_at)
  const endDate = parseISO(event.end_at)

  return (
    <div className="fixed inset-0 z-[210] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg theme-surface border-t sm:border theme-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 mx-auto">
        {/* Color Strip */}
        <div className="h-2 w-full" style={{ backgroundColor: event.color }} />

        <div className="p-6 md:p-8 space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start gap-4">
            <h2 className="text-2xl md:text-3xl font-black theme-text leading-tight">
              {event.title}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0">
              <X className="w-6 h-6 theme-muted" />
            </button>
          </div>

          {/* Time Section */}
          <div className="flex items-start gap-4 p-4 bg-black/5 dark:bg-white/5 rounded-2xl border theme-border">
            <div className="p-3 bg-purple-500/10 rounded-xl">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-black theme-text">
                {format(startDate, 'yyyy年 M月 d日 (eeee)', { locale: ja })}
                {!isSameDay(startDate, endDate) && ` 〜 ${format(endDate, 'yyyy年 M月 d日 (eeee)', { locale: ja })}`}
                {event.is_private && (
                  <span className="ml-2 px-2 py-0.5 bg-red-500/10 text-red-400 text-[10px] rounded-full border border-red-500/20">
                    非公開
                  </span>
                )}
              </p>
              <p className="text-lg font-bold theme-muted">
                {event.is_all_day ? (
                  '終日'
                ) : (
                  `${format(startDate, 'H:mm')} 〜 ${format(endDate, 'H:mm')}`
                )}
              </p>
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-black theme-muted uppercase tracking-widest px-1">
                <AlignLeft className="w-3.5 h-3.5" /> 詳細
              </div>
              <div className="p-5 bg-black/5 dark:bg-white/[0.03] border theme-border rounded-2xl text-base theme-text leading-relaxed whitespace-pre-wrap">
                {event.description}
              </div>
            </div>
          )}

          {/* Creator Profile */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-black theme-muted uppercase tracking-widest px-1">
              <UserIcon className="w-3.5 h-3.5" /> 作成者
            </div>
            <div className="flex items-center gap-4 p-4 bg-black/5 dark:bg-white/[0.02] rounded-2xl border theme-border">
              {event.profiles?.avatar_url ? (
                <img src={event.profiles.avatar_url} alt="" className="w-12 h-12 rounded-full border-2 border-white/10 shadow-xl" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-lg font-black text-white shadow-xl">
                  {event.profiles?.display_name?.[0] || '?'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-base font-bold theme-text">{event.profiles?.display_name || 'Hako Member'}</span>
                <span className="text-xs theme-muted">Shared Hako Member</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex gap-3">
            {isOwner ? (
              <>
                <button
                  onClick={() => onEdit(event)}
                  className="flex-1 py-4 bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 theme-text border theme-border rounded-2xl font-black text-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Edit2 className="w-5 h-5" /> 編集する
                </button>
                <button
                  onClick={() => onDelete(event)}
                  className="p-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-2xl transition-all active:scale-95 border border-red-500/20"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-purple-500/20 active:scale-95 transition-all text-center"
              >
                確認しました
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'

import React, { useState, useEffect } from 'react'
import { X, Clock, Type, AlignLeft, Palette, Loader2, Trash2, Calendar, Repeat, Check } from 'lucide-react'
import { format } from 'date-fns'
import { CalendarEvent } from '@/core/calendar/actions'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: any) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  initialDate?: Date
  editingEvent?: CalendarEvent | null
  currentUserId: string
}

const COLORS = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#10b981' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Orange', value: '#f59e0b' },
  { name: 'Gray', value: '#64748b' },
]

export function EventModal({ isOpen, onClose, onSave, onDelete, initialDate, editingEvent, currentUserId }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [color, setColor] = useState(COLORS[0].value)
  const [isPrivate, setIsPrivate] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isEditable = !editingEvent || editingEvent.user_id === currentUserId

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title)
      setDescription(editingEvent.description || '')
      setStartAt(format(new Date(editingEvent.start_at), "yyyy-MM-dd'T'HH:mm"))
      setEndAt(format(new Date(editingEvent.end_at), "yyyy-MM-dd'T'HH:mm"))
      setIsAllDay(editingEvent.is_all_day)
      setColor(editingEvent.color)
      setIsPrivate(editingEvent.is_private || false)
      setRecurrenceRule(editingEvent.recurrence_rule || null)
    } else if (initialDate) {
      setTitle('')
      setDescription('')
      const start = new Date(initialDate)
      start.setHours(9, 0, 0, 0)
      const end = new Date(initialDate)
      end.setHours(10, 0, 0, 0)
      setStartAt(format(start, "yyyy-MM-dd'T'HH:mm"))
      setEndAt(format(end, "yyyy-MM-dd'T'HH:mm"))
      setIsAllDay(false)
      setColor(COLORS[0].value)
      setIsPrivate(false)
      setRecurrenceRule(null)
    }
  }, [editingEvent, initialDate, isOpen])

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

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSave({
        title,
        description,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        is_all_day: isAllDay,
        color,
        is_private: isPrivate,
        recurrence_rule: recurrenceRule
      })
      onClose()
    } catch (error: any) {
      alert(`保存に失敗しました: ${error.message || String(error)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg theme-surface border-t sm:border theme-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 mx-auto">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between px-5 py-3 md:px-6 md:py-4 border-b theme-border">
            <h3 className="text-base md:text-lg font-black theme-text">
              {editingEvent ? '予定を編集' : '新しい予定'}
            </h3>
            <button type="button" onClick={onClose} className="p-2 hover:theme-elevated rounded-full transition-colors">
              <X className="w-5 h-5 theme-muted" />
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-6 max-h-[70vh] overflow-y-auto overflow-x-hidden no-scrollbar">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-xs font-black theme-muted uppercase tracking-widest flex items-center gap-2">
                <Type className="w-3.5 h-3.5" /> タイトル
              </label>
              <input
                autoFocus
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="予定のタイトルを入力"
                className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-purple-500/50 transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                required
                disabled={!isEditable}
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-[10px] md:text-xs font-black theme-muted uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5" /> 開始
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-xl px-3 py-3 theme-text text-sm focus:outline-none focus:border-purple-500/50 transition-all min-w-0 box-border appearance-none disabled:opacity-50 [color-scheme:light_dark]"
                  required
                  disabled={!isEditable}
                />
              </div>
              <div className="space-y-2 min-w-0">
                <label className="text-[10px] md:text-xs font-black theme-muted uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> 終了
                </label>
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-xl px-3 py-3 theme-text text-sm focus:outline-none focus:border-purple-500/50 transition-all min-w-0 box-border appearance-none disabled:opacity-50 [color-scheme:light_dark]"
                  required
                  disabled={!isEditable}
                />
              </div>
            </div>

            {/* All Day and Recurrence */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <label className="flex items-center gap-3 cursor-pointer group shrink-0">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={e => setIsAllDay(e.target.checked)}
                      className="sr-only"
                      disabled={!isEditable}
                    />
                    <div className={`w-10 h-5 rounded-full transition-colors ${isAllDay ? 'bg-purple-600' : 'bg-black/20 dark:bg-gray-800'} ${!isEditable ? 'opacity-50' : ''}`} />
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isAllDay ? 'right-1' : 'left-1'}`} />
                  </div>
                  <span className="text-sm font-bold theme-text">終日</span>
                </label>

                <div className="flex-1 w-full sm:w-auto h-[1px] sm:h-8 sm:w-[1px] bg-white/10 hidden sm:block" />

                <div className="flex-1 w-full flex items-center gap-2">
                    <Repeat className="w-4 h-4 theme-muted" />
                    <select
                        value={recurrenceRule || 'none'}
                        onChange={(e) => setRecurrenceRule(e.target.value === 'none' ? null : e.target.value)}
                        disabled={!isEditable}
                        className="flex-1 bg-black/5 dark:bg-white/5 border theme-border rounded-xl px-2 py-2 theme-text text-xs font-bold focus:outline-none focus:border-purple-500/50 transition-all [color-scheme:light_dark]"
                    >
                        <option value="none">繰り返さない</option>
                        <option value="daily">毎日</option>
                        <option value="weekly">毎週</option>
                        <option value="monthly">毎月</option>
                        <option value="yearly">毎年</option>
                    </select>
                </div>
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <label className="text-xs font-black theme-muted uppercase tracking-widest flex items-center gap-2">
                <Palette className="w-3.5 h-3.5" /> カラー
              </label>
              <div className="flex flex-wrap gap-2 md:gap-3">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    disabled={!isEditable}
                    className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 transition-all flex items-center justify-center ${color === c.value ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'} disabled:cursor-not-allowed`}
                    style={{ backgroundColor: c.value }}
                  >
                    {color === c.value && <Check className="w-4 h-4 text-white drop-shadow-md" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy Toggle */}
            <div className="p-4 bg-black/5 dark:bg-white/5 border theme-border rounded-2xl flex items-center justify-between group">
              <div className="space-y-0.5">
                <span className="text-sm font-bold theme-text">箱全体に共有する</span>
                <p className="text-[10px] theme-muted font-medium">オフにすると自分だけに表示されます</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={!isPrivate}
                  onChange={e => setIsPrivate(!e.target.checked)}
                  className="sr-only peer"
                  disabled={!isEditable}
                />
                <div className="w-11 h-6 bg-black/20 dark:bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-xs font-black theme-muted uppercase tracking-widest flex items-center gap-2">
                <AlignLeft className="w-3.5 h-3.5" /> 説明
              </label>
               <textarea
                 value={description}
                 onChange={e => setDescription(e.target.value)}
                 placeholder="詳細を入力してください（任意）"
                 rows={3}
                 className="w-full bg-black/5 dark:bg-white/5 border theme-border rounded-xl px-4 py-3 theme-text text-sm focus:outline-none focus:border-purple-500/50 transition-all resize-none disabled:opacity-50"
                 disabled={!isEditable}
               />
             </div>

             {!isEditable && editingEvent?.profiles && (
               <div className="pt-4 border-t theme-border overflow-hidden">
                 <div className="flex items-center gap-3 px-4 py-3 bg-black/5 dark:bg-white/5 rounded-2xl">
                   {editingEvent.profiles.avatar_url ? (
                     <img src={editingEvent.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                   ) : (
                     <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-[10px] font-black text-white">
                       {editingEvent.profiles.display_name?.[0] || '?'}
                     </div>
                   )}
                   <div className="flex flex-col min-w-0">
                     <span className="text-[10px] font-black theme-muted uppercase tracking-widest whitespace-nowrap">作成者</span>
                     <span className="text-sm font-bold theme-text truncate">{editingEvent.profiles.display_name || 'Unknown'}</span>
                   </div>
                 </div>
               </div>
             )}
           </div>

           <div className="p-4 md:p-6 border-t theme-border flex gap-3">
              {editingEvent && isEditable && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(editingEvent.id)}
                  className="p-3 md:p-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-2xl transition-all active:scale-95"
                  title="削除"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
             {isEditable && (
               <button
                 type="submit"
                 disabled={isSubmitting}
                 className="flex-1 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-black text-base md:text-lg shadow-xl shadow-purple-500/20 active:scale(0.98) disabled:opacity-50 flex items-center justify-center gap-2"
               >
                 {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存する'}
               </button>
             )}
             {!isEditable && (
                <button
                   type="button"
                   onClick={onClose}
                   className="flex-1 py-3 md:py-4 bg-white/10 hover:bg-white/15 theme-text rounded-2xl font-black text-base md:text-lg transition-all active:scale(0.98)"
                 >
                   閉じる
                 </button>
             )}
           </div>
         </form>
       </div>
     </div>
   )
 }

'use client'

import React, { useState, useEffect } from 'react'
import { X, Clock, Type, AlignLeft, Palette, Loader2, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { CalendarEvent } from '@/core/calendar/actions'

interface EventModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (event: any) => Promise<void>
  onDelete?: (id: string) => Promise<void>
  initialDate?: Date
  editingEvent?: CalendarEvent | null
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

export function EventModal({ isOpen, onClose, onSave, onDelete, initialDate, editingEvent }: EventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [color, setColor] = useState(COLORS[0].value)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title)
      setDescription(editingEvent.description || '')
      setStartAt(format(new Date(editingEvent.start_at), "yyyy-MM-dd'T'HH:mm"))
      setEndAt(format(new Date(editingEvent.end_at), "yyyy-MM-dd'T'HH:mm"))
      setIsAllDay(editingEvent.is_all_day)
      setColor(editingEvent.color)
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
        color
      })
      onClose()
    } catch (error) {
      alert('保存に失敗しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-[#111] border-t sm:border theme-border rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 mx-auto">
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
                className="w-full bg-white/5 border theme-border rounded-xl px-4 py-3 theme-text focus:outline-none focus:border-purple-500/50 transition-all font-bold"
                required
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 min-w-0">
                <label className="text-[10px] md:text-xs font-black theme-muted uppercase tracking-widest flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" /> 開始
                </label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
                  className="w-full bg-white/5 border theme-border rounded-xl px-3 py-3 theme-text text-sm focus:outline-none focus:border-purple-500/50 transition-all min-w-0 box-border appearance-none"
                  required
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
                  className="w-full bg-white/5 border theme-border rounded-xl px-3 py-3 theme-text text-sm focus:outline-none focus:border-purple-500/50 transition-all min-w-0 box-border appearance-none"
                  required
                />
              </div>
            </div>

            {/* All Day Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={e => setIsAllDay(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-5 rounded-full transition-colors ${isAllDay ? 'bg-purple-600' : 'bg-gray-800'}`} />
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isAllDay ? 'right-1' : 'left-1'}`} />
              </div>
              <span className="text-sm font-bold theme-text">終日</span>
            </label>

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
                    className={`w-8 h-8 md:w-9 md:h-9 rounded-full border-2 transition-all ${color === c.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: c.value }}
                  />
                ))}
              </div>
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
                className="w-full bg-white/5 border theme-border rounded-xl px-4 py-3 theme-text text-sm focus:outline-none focus:border-purple-500/50 transition-all resize-none"
              />
            </div>
          </div>

          <div className="p-4 md:p-6 border-t theme-border flex gap-3">
             {editingEvent && onDelete && (
               <button
                 type="button"
                 onClick={() => onDelete(editingEvent.id)}
                 className="p-3 md:p-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-2xl transition-all active:scale-95"
                 title="削除"
               >
                 <Trash2 className="w-5 h-5" />
               </button>
             )}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 md:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-black text-base md:text-lg shadow-xl shadow-purple-500/20 active:scale(0.98) disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : '保存する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

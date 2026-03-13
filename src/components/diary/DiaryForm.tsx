'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Lock, Unlock, Loader2, Check, AlertCircle, ChevronLeft, ChevronRight, X, Sparkles } from 'lucide-react'
import { createDiaryEntry, updateDiaryEntry, fetchUserDiaryDates } from '@/core/diary/actions'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isFuture, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'

interface DiaryFormProps {
  hakoId: string
  initialData?: {
    id: string
    title: string | null
    content: string
    diary_date: string
    is_public: boolean
  }
}

export function DiaryForm({ hakoId, initialData }: DiaryFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingDates, setExistingDates] = useState<string[]>([])
  const [title, setTitle] = useState(initialData?.title || '')
  const [content, setContent] = useState(initialData?.content || '')
  const [isPublic, setIsPublic] = useState(initialData?.is_public ?? true)
  
  // Initialize with today if the provided date is in the future
  const initialDate = initialData?.diary_date || format(new Date(), 'yyyy-MM-dd')
  const clampedDate = isFuture(parseISO(initialDate)) && !isToday(parseISO(initialDate)) ? format(new Date(), 'yyyy-MM-dd') : initialDate
  
  const [diaryDate, setDiaryDate] = useState(clampedDate)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [calendarMonth, setCalendarMonth] = useState(parseISO(clampedDate))

  useEffect(() => {
    const loadDates = async () => {
      try {
        const dates = await fetchUserDiaryDates(hakoId)
        setExistingDates(dates)
      } catch (err) {
        console.error('Failed to load user diary dates:', err)
      }
    }
    if (!initialData) loadDates()
  }, [hakoId, initialData])

  const isAlreadyExists = !initialData && existingDates.includes(diaryDate)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    if (isAlreadyExists) {
        setError('この日付の日記は既に存在します。')
        return
    }

    setLoading(true)
    setError(null)

    try {
      if (initialData) {
        await updateDiaryEntry(initialData.id, hakoId, { 
          title: title.trim() || (null as any), 
          content, 
          diary_date: diaryDate,
          is_public: isPublic 
        })
      } else {
        await createDiaryEntry(hakoId, title, content, diaryDate, isPublic)
      }
      router.push(`/hako/${hakoId}/diary`)
      router.refresh()
    } catch (err: any) {
      setError(err.message || '保存に失敗しました')
    } finally {
      setLoading(false)
    }
  }


  return (
    <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="space-y-4">
        {/* Date Selection */}
        <div className="relative">
          <label className="block text-[10px] font-black theme-muted uppercase tracking-widest mb-2 px-1">日付</label>
          <div className="relative inline-block w-auto">
            <button 
              type="button"
              onClick={() => {
                setCalendarMonth(parseISO(diaryDate))
                setShowDatePicker(true)
              }}
              className={`flex items-center gap-2 theme-elevated hover:theme-surface border ${isAlreadyExists ? 'border-red-500/50 focus:border-red-500' : 'theme-border hover:border-white/20'} rounded-xl py-3 px-5 theme-text focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-sm cursor-pointer shadow-sm`}
            >
               <Calendar className="w-4 h-4 text-gray-400 group-hover:text-blue-400 transition-colors" />
               <span className="text-left w-36">{format(parseISO(diaryDate), 'yyyy年MM月dd日 (E)', { locale: ja })}</span>
            </button>
          </div>
          {isAlreadyExists && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1 px-1">
                <AlertCircle className="w-3 h-3" /> この日付は既に日記を書いています
              </p>
          )}
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-2 px-1">
            <label className="block text-[10px] font-black theme-muted uppercase tracking-widest">タイトル (任意)</label>
          </div>
          <input 
            type="text" 
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full theme-surface border theme-border focus:border-blue-500/50 rounded-2xl py-4 px-6 theme-text focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-lg placeholder:text-gray-500"
          />
        </div>

        {/* Content */}
        <div className="relative">
          <label className="block text-[10px] font-black theme-muted uppercase tracking-widest mb-2 px-1">内容</label>
          <textarea 
            placeholder="今日の出来事や気持ちを書きましょう..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full theme-surface border theme-border focus:border-blue-500/50 rounded-3xl py-6 px-6 theme-text focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all leading-relaxed placeholder:text-gray-500 resize-none"
            required
          />
        </div>

        {/* Visibility */}
        <div className="flex items-center gap-4 px-1 pt-2">
            <button 
                type="button" 
                onClick={() => setIsPublic(true)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all font-bold text-sm ${isPublic ? 'bg-blue-600/10 border-blue-500/30 text-blue-400' : 'bg-transparent border-white/5 text-gray-500 hover:border-white/10'}`}
            >
                <Unlock className="w-4 h-4" /> 公開
            </button>
            <button 
                type="button" 
                onClick={() => setIsPublic(false)}
                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border transition-all font-bold text-sm ${!isPublic ? 'bg-orange-600/10 border-orange-500/30 text-orange-400' : 'bg-transparent border-white/5 text-gray-500 hover:border-white/10'}`}
            >
                <Lock className="w-4 h-4" /> 非公開
            </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm font-medium flex items-center gap-2">
           <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !content.trim() || isAlreadyExists}
        className="w-full bg-white text-black font-black py-5 rounded-2xl hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-2 text-lg"
      >
        {loading ? (
             <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
            <>
                <Check className="w-6 h-6 border-2 border-black rounded-full p-0.5" />
                {initialData ? '日記を更新する' : '日記を投稿する'}
            </>
        )}
      </button>

      {/* Custom Date Picker Modal */}
      {showDatePicker && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDatePicker(false)} />
          <div className="relative w-full max-w-[340px] theme-surface border theme-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg theme-text">
                {format(calendarMonth, 'yyyy年 MM月', { locale: ja })}
              </h3>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))} className="p-2 theme-muted hover:theme-text hover:bg-white/5 rounded-full transition-colors">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))} className="p-2 theme-muted hover:theme-text hover:bg-white/5 rounded-full transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
                <div key={d} className="text-center text-[10px] font-black theme-muted uppercase pb-2">
                  {d}
                </div>
              ))}
              
              {Array(startOfMonth(calendarMonth).getDay()).fill(null).map((_, i) => (
                <div key={`blank-${i}`} className="aspect-square" />
              ))}

              {eachDayOfInterval({ start: startOfMonth(calendarMonth), end: endOfMonth(calendarMonth) }).map((day) => {
                const dateStr = format(day, 'yyyy-MM-dd')
                const isSelected = diaryDate === dateStr
                const isFutureDay = isFuture(day) && !isToday(day)
                const hasEntry = existingDates.includes(dateStr)

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => {
                      if (!isFutureDay) {
                        setDiaryDate(dateStr)
                        setShowDatePicker(false)
                      }
                    }}
                    disabled={isFutureDay}
                    className={`
                      relative aspect-square rounded-2xl flex flex-col items-center justify-center text-sm font-bold transition-all group
                      ${isFutureDay ? 'opacity-20 cursor-not-allowed theme-muted' : 'hover:bg-white/5 data-[theme=light]:hover:bg-black/5 theme-muted'}
                      ${isSelected ? 'bg-blue-600 ring-1 ring-blue-500/30' : isToday(day) ? 'bg-blue-500/10 ring-1 ring-blue-500/20' : ''}
                    `}
                  >
                    <span className={`
                      flex items-center justify-center w-8 h-8 rounded-full transition-all
                      ${isSelected 
                        ? 'text-white' 
                        : isToday(day) 
                          ? 'text-blue-400' 
                          : 'theme-muted hover:theme-text'}
                    `}>
                      {format(day, 'd')}
                    </span>
                    
                    {hasEntry && (
                      <div className="absolute bottom-2 flex gap-0.5">
                        <div className={`w-1 h-1 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)] ${isSelected ? 'bg-blue-400' : 'bg-blue-500/60'}`} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowDatePicker(false)}
              className="mt-6 w-full py-3.5 rounded-xl theme-elevated theme-muted hover:bg-white/10 hover:theme-text font-bold text-sm transition-all flex items-center justify-center gap-2 border theme-border"
            >
              <X className="w-4 h-4" /> 閉じる
            </button>
          </div>
        </div>
      )}
    </form>
  )
}

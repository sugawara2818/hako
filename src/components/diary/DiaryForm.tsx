'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Lock, Unlock, Loader2, Check, AlertCircle } from 'lucide-react'
import { createDiaryEntry, updateDiaryEntry, fetchUserDiaryDates } from '@/core/diary/actions'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
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
  const [diaryDate, setDiaryDate] = useState(initialData?.diary_date || format(new Date(), 'yyyy-MM-dd'))

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
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">日付</label>
          <div className="relative group">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="date" 
              value={diaryDate}
              onChange={(e) => setDiaryDate(e.target.value)}
              className={`w-full bg-[#111] border ${isAlreadyExists ? 'border-red-500/50 focus:border-red-500' : 'border-white/5 focus:border-blue-500/50'} rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium appearance-none`}
            />
          </div>
          {isAlreadyExists && (
              <p className="mt-2 text-xs text-red-400 flex items-center gap-1 px-1">
                <AlertCircle className="w-3 h-3" /> この日付は既に日記を書いています
              </p>
          )}
        </div>

        {/* Title */}
        <div className="relative">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">タイトル (任意)</label>
          <input 
            type="text" 
            placeholder="タイトルを入力..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-[#111] border border-white/5 focus:border-blue-500/50 rounded-2xl py-4 px-6 text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-bold text-lg placeholder:text-gray-700"
          />
        </div>

        {/* Content */}
        <div className="relative">
          <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 px-1">内容</label>
          <textarea 
            placeholder="今日の出来事や気持ちを書きましょう..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            className="w-full bg-[#111] border border-white/5 focus:border-blue-500/50 rounded-3xl py-6 px-6 text-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all leading-relaxed placeholder:text-gray-700 resize-none"
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
    </form>
  )
}

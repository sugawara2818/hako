'use client'

import React, { useState, useMemo } from 'react'
import { Plus, List, Calendar as CalendarIcon, Loader2, ArrowUpDown } from 'lucide-react'
import Link from 'next/link'
import { DiaryFeed } from './DiaryFeed'
import { DiaryCalendar } from './DiaryCalendar'
import { deleteDiaryEntry } from '@/core/diary/actions'
import { useRouter, useSearchParams } from 'next/navigation'

interface DiaryPortalProps {
  hakoId: string
  currentUserId: string
  initialEntries: any[]
}

export function DiaryPortal({ hakoId, currentUserId, initialEntries }: DiaryPortalProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URL-driven states
  const view = (searchParams.get('view') as 'list' | 'calendar') || 'list'
  const selectedFilterDate = searchParams.get('date') || null
  
  const [entries, setEntries] = useState(initialEntries)
  const [sortMode, setSortMode] = useState<'date_desc' | 'date_asc' | 'created_desc' | 'created_asc'>('date_desc')

  const updateURL = (params: { view?: 'list' | 'calendar'; date?: string | null }) => {
    const nextParams = new URLSearchParams(searchParams.toString())
    if (params.view) nextParams.set('view', params.view)
    if (params.date !== undefined) {
      if (params.date) nextParams.set('date', params.date)
      else nextParams.delete('date')
    }
    router.push(`/hako/${hakoId}/diary?${nextParams.toString()}`)
  }

  const setView = (v: 'list' | 'calendar') => updateURL({ view: v })
  const setSelectedFilterDate = (date: string | null) => updateURL({ date })

  const handleDelete = async (id: string) => {
    try {
      await deleteDiaryEntry(id, hakoId)
      setEntries(prev => prev.filter(e => e.id !== id))
      router.refresh()
    } catch (err) {
      alert('削除に失敗しました')
    }
  }

  const handleDateSelect = (date: string) => {
    updateURL({ view: 'list', date })
  }

  const filteredEntries = selectedFilterDate
    ? entries.filter(e => e.diary_date === selectedFilterDate)
    : entries

  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => {
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
  }, [filteredEntries, sortMode])

  return (
    <>
      <div className="w-full max-w-4xl mx-auto space-y-4 md:space-y-8">
      {/* View Switcher & Actions */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-0">
        <div className="flex items-center gap-1 bg-black/40 border border-white/5 p-1 rounded-2xl">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${view === 'list' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">一覧</span>
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-3 sm:px-5 py-2 sm:py-2 rounded-xl font-bold text-xs sm:text-sm transition-all ${view === 'calendar' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden xs:inline">カレンダー</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedFilterDate && (
            <button
              onClick={() => setSelectedFilterDate(null)}
              className="px-3 py-2 text-[10px] font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-xl hover:bg-orange-400/20 transition-all flex items-center gap-1 animate-in fade-in zoom-in-95"
            >
              解除: {selectedFilterDate}
            </button>
          )}

          {view === 'list' && (
            <div className="relative group/sort">
              <select 
                value={sortMode}
                onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
                className="appearance-none bg-black/40 border border-white/5 theme-text text-[11px] sm:text-sm font-bold rounded-xl pl-3 sm:pl-4 pr-8 sm:pr-10 py-2 sm:py-2.5 outline-none focus:border-blue-500/30 hover:bg-white/5 transition-all w-auto"
              >
                <option value="date_desc">新しい順 (日付)</option>
                <option value="date_asc">古い順 (日付)</option>
                <option value="created_desc">新しい順 (投稿日)</option>
                <option value="created_asc">古い順 (投稿日)</option>
              </select>
              <ArrowUpDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500 absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {view === 'list' ? (
          <DiaryFeed
            hakoId={hakoId}
            currentUserId={currentUserId}
            entries={sortedEntries}
            onDelete={handleDelete}
            selectedFilterDate={selectedFilterDate}
          />
        ) : (
          <div className="max-w-md mx-auto relative group">
            <DiaryCalendar hakoId={hakoId} onDateSelect={handleDateSelect} selectedDate={selectedFilterDate} />
          </div>
        )}
      </div>
    </div>

    {/* Floating Action Button */}
    <Link
      href={`/hako/${hakoId}/diary/new${selectedFilterDate ? `?date=${selectedFilterDate}` : ''}`}
      className="fixed bottom-24 md:bottom-6 right-4 md:right-8 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center shadow-lg shadow-blue-900/50 transition-all hover:scale-105 active:scale-95 z-40 group"
    >
      <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
    </Link>
    </>
  )
}

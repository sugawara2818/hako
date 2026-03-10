'use client'

import React, { useState } from 'react'
import { Plus, List, Calendar as CalendarIcon, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { DiaryFeed } from './DiaryFeed'
import { DiaryCalendar } from './DiaryCalendar'
import { deleteDiaryEntry } from '@/core/diary/actions'
import { useRouter } from 'next/navigation'

interface DiaryPortalProps {
  hakoId: string
  currentUserId: string
  initialEntries: any[]
}

export function DiaryPortal({ hakoId, currentUserId, initialEntries }: DiaryPortalProps) {
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [entries, setEntries] = useState(initialEntries)
  const [selectedFilterDate, setSelectedFilterDate] = useState<string | null>(null)
  const router = useRouter()

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
    setSelectedFilterDate(date)
    setView('list')
  }

  const filteredEntries = selectedFilterDate
    ? entries.filter(e => e.diary_date === selectedFilterDate)
    : entries

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      {/* View Switcher & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 bg-[#111] border border-white/5 p-1 rounded-2xl self-start">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${view === 'list' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            <List className="w-4 h-4" /> 一覧
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${view === 'calendar' ? 'bg-white text-black shadow-lg' : 'text-gray-500 hover:text-white'}`}
          >
            <CalendarIcon className="w-4 h-4" /> カレンダー
          </button>
        </div>

        <div className="flex items-center gap-3">
          {selectedFilterDate && (
            <button
              onClick={() => setSelectedFilterDate(null)}
              className="px-4 py-2 text-xs font-bold text-orange-400 bg-orange-400/10 border border-orange-400/20 rounded-xl hover:bg-orange-400/20 transition-all"
            >
              {selectedFilterDate} のフィルターを解除
            </button>
          )}

          <Link
            href={`/hako/${hakoId}/diary/new${selectedFilterDate ? `?date=${selectedFilterDate}` : ''}`}
            className="flex items-center justify-center gap-2 px-6 py-3.5 text-white font-black rounded-2xl transition-all shadow-lg text-sm group"
            style={{ backgroundColor: 'var(--brand-blue)' }}
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
            {selectedFilterDate ? `${selectedFilterDate} の日記を書く` : '日記を書く'}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
        {view === 'list' ? (
          <DiaryFeed
            hakoId={hakoId}
            currentUserId={currentUserId}
            entries={filteredEntries}
            onDelete={handleDelete}
          />
        ) : (
          <div className="max-w-md mx-auto">
            <DiaryCalendar hakoId={hakoId} onDateSelect={handleDateSelect} selectedDate={selectedFilterDate} />
          </div>
        )}
      </div>
    </div>
  )
}

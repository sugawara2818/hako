'use client'

import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday, isFuture } from 'date-fns'
import { ja } from 'date-fns/locale'
import { fetchDiaryStats } from '@/core/diary/actions'

interface DiaryCalendarProps {
  hakoId: string
  onDateSelect: (date: string) => void
  selectedDate?: string | null
}

export function DiaryCalendar({ hakoId, onDateSelect, selectedDate }: DiaryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true)
      try {
        const data = await fetchDiaryStats(hakoId, currentMonth.getFullYear(), currentMonth.getMonth())
        setStats(data)
      } catch (err) {
        console.error('Failed to fetch calendar stats:', err)
      } finally {
        setLoading(false)
      }
    }
    loadStats()
  }, [hakoId, currentMonth])

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  })

  // Fill in blank days at start
  const firstDayOfMonth = startOfMonth(currentMonth).getDay()
  const blanks = Array(firstDayOfMonth).fill(null)

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))

  return (
    <div className="theme-surface border theme-border rounded-3xl p-6 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold theme-text flex items-center gap-2">
          {format(currentMonth, 'yyyy年 MM月', { locale: ja })}
          {loading && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
        </h2>
        <div className="flex items-center gap-1">
          <button onClick={handlePrevMonth} className="p-2 theme-muted hover:theme-text hover:bg-white/5 rounded-full transition-all">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={handleNextMonth} className="p-2 theme-muted hover:theme-text hover:bg-white/5 rounded-full transition-all">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
          <div key={d} className="text-center text-[10px] font-black theme-muted uppercase tracking-widest pb-4">
            {d}
          </div>
        ))}
        
        {blanks.map((_, i) => (
          <div key={`blank-${i}`} className="aspect-square" />
        ))}

        {days.map((day) => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const count = stats[dateStr] || 0
          const isSelected = selectedDate === dateStr
          const isFutureDay = isFuture(day) && !isToday(day)

          return (
            <button
              key={dateStr}
              onClick={() => !isFutureDay && onDateSelect(dateStr)}
              disabled={isFutureDay}
              className={`
                relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all group
                ${isFutureDay ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/5'}
                ${isSelected ? 'bg-blue-600/20 ring-1 ring-blue-500/30' : ''}
              `}
            >
              <span className={`text-sm font-bold ${isSelected ? 'text-blue-400' : isToday(day) ? 'theme-text border-t-2 border-blue-500 pt-1' : 'theme-muted hover:theme-text'}`}>
                {format(day, 'd')}
              </span>
              
              {count > 0 && (
                <div className="absolute bottom-2 flex gap-0.5">
                  {[...Array(Math.min(count, 3))].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-blue-500/60 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

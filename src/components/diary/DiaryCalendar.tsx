'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, addMonths, subMonths, isToday, isFuture, parseISO } from 'date-fns'
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
  const [isPending, startTransition] = React.useTransition()

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

  const days = useMemo(() => eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  }), [currentMonth])

  const blanks = useMemo(() => {
    const firstDayOfMonth = startOfMonth(currentMonth).getDay()
    return Array(firstDayOfMonth).fill(null)
  }, [currentMonth])

  const handlePrevMonth = () => startTransition(() => setCurrentMonth(subMonths(currentMonth, 1)))
  const handleNextMonth = () => startTransition(() => setCurrentMonth(addMonths(currentMonth, 1)))

  return (
    <div className={`theme-surface border theme-border rounded-3xl p-6 shadow-xl transition-opacity duration-200 ${isPending ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold theme-text flex items-center gap-2">
          {format(currentMonth, 'yyyy年 MM月', { locale: ja })}
          {(loading || isPending) && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
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

        {days.map((day) => (
          <CalendarDay 
            key={day.toISOString()}
            day={day}
            count={stats[format(day, 'yyyy-MM-dd')] || 0}
            isSelected={selectedDate === format(day, 'yyyy-MM-dd')}
            onSelect={onDateSelect}
          />
        ))}
      </div>
    </div>
  )
}

const CalendarDay = React.memo(({ day, count, isSelected, onSelect }: { 
  day: Date; 
  count: number; 
  isSelected: boolean; 
  onSelect: (date: string) => void 
}) => {
  const dateStr = format(day, 'yyyy-MM-dd')
  const isFutureDay = isFuture(day) && !isToday(day)

  return (
    <button
      onClick={() => !isFutureDay && onSelect(dateStr)}
      disabled={isFutureDay}
      className={`
        relative aspect-square rounded-2xl flex flex-col items-center justify-center transition-all group
        ${isFutureDay ? 'opacity-20 cursor-not-allowed' : 'hover:bg-white/5'}
        ${isSelected ? 'bg-blue-600/20 ring-1 ring-blue-500/30' : ''}
      `}
    >
      <span className={`
        flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all
        ${isSelected 
          ? 'bg-blue-600 text-white' 
          : isToday(day) 
            ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' 
            : 'theme-muted hover:theme-text'}
      `}>
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
})

CalendarDay.displayName = 'CalendarDay'

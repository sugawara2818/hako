'use client'

import React, { useMemo, useState } from 'react'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths,
  isSameDay
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react'

interface ProfileDiaryCalendarProps {
  entries: any[]
  hakoId: string
  userId: string
  onDateClick?: (date: string) => void
}

export function ProfileDiaryCalendar({ entries, hakoId, userId, onDateClick }: ProfileDiaryCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const entryDates = useMemo(() => {
    return new Set(entries.map(e => format(new Date(e.diary_date), 'yyyy-MM-dd')))
  }, [entries])

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  return (
    <div className="theme-surface border theme-border rounded-3xl p-6 mb-8 animate-in fade-in duration-500 shadow-xl">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-xl font-black theme-text tracking-tight">
          {format(currentMonth, 'yyyy年 MM月', { locale: ja })}
        </h3>
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-2xl border theme-border">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:theme-elevated rounded-xl transition-all theme-muted hover:theme-text">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:theme-elevated rounded-xl transition-all theme-muted hover:theme-text">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <div key={d} className={`text-center py-2 text-[10px] font-black uppercase tracking-tighter opacity-40 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'theme-text'}`}>
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const hasEntry = entryDates.has(dateKey)
          const isCurrent = isSameMonth(day, currentMonth)
          const isT = isToday(day)

          return (
            <div 
              key={dateKey}
              onClick={() => hasEntry && onDateClick?.(dateKey)}
              className={`aspect-square flex flex-col items-center justify-center rounded-2xl transition-all relative ${
                !isCurrent ? 'opacity-10 pointer-events-none' : 'hover:bg-white/5 cursor-pointer'
              } ${
                isT ? 'bg-blue-600/15 ring-1 ring-blue-500/20' : ''
              }`}
            >
              <span className={`text-sm font-bold ${
                isT ? 'text-blue-500' : 
                hasEntry ? 'theme-text opacity-100 font-black' :
                i % 7 === 0 ? 'text-red-400/60' :
                i % 7 === 6 ? 'text-blue-400/60' :
                'theme-text opacity-40'
              }`}>
                {format(day, 'd')}
              </span>
              {hasEntry && (
                <div className={`mt-1 w-1 h-1 rounded-full ${isT ? 'bg-blue-400' : 'bg-blue-500/60'}`} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

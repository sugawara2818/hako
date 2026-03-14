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
}

export function ProfileDiaryCalendar({ entries }: ProfileDiaryCalendarProps) {
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
    <div className="theme-surface border theme-border rounded-3xl p-6 mb-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <h3 className="text-sm font-black theme-text uppercase tracking-widest">Diary History</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold theme-text mr-2">{format(currentMonth, 'yyyy年 M月', { locale: ja })}</span>
          <div className="flex gap-1">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:theme-elevated rounded-xl transition-all theme-muted hover:theme-text">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:theme-elevated rounded-xl transition-all theme-muted hover:theme-text">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
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
              className={`aspect-square flex flex-col items-center justify-center rounded-xl transition-all relative ${
                !isCurrent ? 'opacity-10 pointer-events-none' : 'hover:theme-elevated'
              } ${
                hasEntry ? 'bg-blue-500/10 border border-blue-500/30' : ''
              }`}
            >
              <span className={`text-[10px] font-black ${
                isT ? 'text-blue-400 underline underline-offset-4 decoration-2' : 
                hasEntry ? 'text-blue-400' :
                i % 7 === 0 ? 'text-red-400/60' :
                i % 7 === 6 ? 'text-blue-400/60' :
                'theme-text opacity-60'
              }`}>
                {format(day, 'd')}
              </span>
              {hasEntry && (
                <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

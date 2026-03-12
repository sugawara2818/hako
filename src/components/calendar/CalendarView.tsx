'use client'

import React, { useState, useMemo } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, User as UserIcon } from 'lucide-react'
import { CalendarEvent } from '@/core/calendar/actions'

interface CalendarViewProps {
  hakoId: string
  initialEvents: CalendarEvent[]
  onAddEvent: (date: Date) => void
  onEditEvent: (event: CalendarEvent) => void
}

export function CalendarView({ hakoId, initialEvents, onAddEvent, onEditEvent }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1))
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1))

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    initialEvents.forEach(event => {
      const dateKey = format(parseISO(event.start_at), 'yyyy-MM-dd')
      if (!map[dateKey]) map[dateKey] = []
      map[dateKey].push(event)
    })
    return map
  }, [initialEvents])

  return (
    <div className="flex flex-col h-full theme-bg overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b theme-border bg-white/[0.02]">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black theme-text">
            {format(currentMonth, 'yyyy年 M月', { locale: ja })}
          </h2>
          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border theme-border">
            <button onClick={prevMonth} className="p-1.5 hover:theme-elevated rounded-lg transition-colors theme-muted hover:theme-text">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs font-bold theme-muted hover:theme-text transition-colors">
              今日
            </button>
            <button onClick={nextMonth} className="p-1.5 hover:theme-elevated rounded-lg transition-colors theme-muted hover:theme-text">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <button 
          onClick={() => onAddEvent(new Date())}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> 予定を追加
        </button>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b theme-border bg-white/[0.01]">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
          <div key={day} className={`py-3 text-center text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-red-400/70' : i === 6 ? 'text-blue-400/70' : 'theme-muted'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto no-scrollbar">
        {days.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay[dateKey] || []
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTodayDate = isToday(day)

          return (
            <div 
              key={day.toString()} 
              onClick={() => onAddEvent(day)}
              className={`min-h-[100px] md:min-h-[120px] p-2 border-r border-b theme-border transition-colors hover:bg-white/[0.02] cursor-pointer group ${!isCurrentMonth ? 'opacity-30' : ''}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-black w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                  isTodayDate ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 
                  i % 7 === 0 ? 'text-red-400' :
                  i % 7 === 6 ? 'text-blue-400' :
                  'theme-text opacity-70'
                }`}>
                  {format(day, 'd')}
                </span>
                <Plus className="w-3 h-3 theme-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              
              <div className="space-y-1">
                {dayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditEvent(event)
                    }}
                    className="w-full text-left px-2 py-1 rounded-md text-[10px] font-bold truncate transition-all active:scale-95 shadow-sm border border-black/10"
                    style={{ 
                      backgroundColor: `${event.color}20`, 
                      color: event.color,
                      borderLeft: `3px solid ${event.color}`
                    }}
                  >
                    {!event.is_all_day && (
                        <span className="mr-1 opacity-70">{format(parseISO(event.start_at), 'H:mm')}</span>
                    )}
                    {event.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

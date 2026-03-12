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
import { ChevronLeft, ChevronRight, Plus, MapPin, Clock, User as UserIcon, Calendar } from 'lucide-react'
import { CalendarEvent } from '@/core/calendar/actions'

interface CalendarViewProps {
  hakoId: string
  initialEvents: CalendarEvent[]
  onAddEvent: (date: Date) => void
  onEditEvent: (event: CalendarEvent) => void
}

export function CalendarView({ hakoId, initialEvents, onAddEvent, onEditEvent }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  
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
      <div className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b theme-border bg-white/[0.02]">
        <div className="flex items-center gap-2 md:gap-4">
          <h2 className="text-lg md:text-2xl font-black theme-text">
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
          className="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-xs md:text-sm shadow-lg shadow-purple-500/20 active:scale-95 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">予定を追加</span>
        </button>
      </div>

      {/* Weekdays Header */}
      <div className="grid grid-cols-7 border-b theme-border bg-white/[0.01]">
        {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
          <div key={day} className={`py-2 md:py-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-red-400/70' : i === 6 ? 'text-blue-400/70' : 'theme-muted'}`}>
            {day}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 auto-rows-fr border-b theme-border">
        {days.map((day, i) => {
          const dateKey = format(day, 'yyyy-MM-dd')
          const dayEvents = eventsByDay[dateKey] || []
          const isCurrentMonth = isSameMonth(day, currentMonth)
          const isTodayDate = isToday(day)
          const isSelected = isSameDay(day, selectedDay)

          return (
            <div 
              key={day.toString()} 
              onClick={() => setSelectedDay(day)}
              className={`min-h-[70px] md:min-h-[100px] p-1 md:p-2 border-r border-b theme-border transition-all cursor-pointer group relative ${!isCurrentMonth ? 'opacity-20' : ''} ${isSelected ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-[10px] md:text-xs font-black w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full transition-colors ${
                  isTodayDate ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 
                  isSelected ? 'bg-white/20 theme-text' :
                  i % 7 === 0 ? 'text-red-400' :
                  i % 7 === 6 ? 'text-blue-400' :
                  'theme-text opacity-70'
                }`}>
                  {format(day, 'd')}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-0.5">
                {dayEvents.slice(0, 3).map(event => (
                  <div 
                    key={event.id}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                ))}
                {dayEvents.length > 3 && (
                  <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
                )}
              </div>

              {isSelected && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500 shadow-[0_0_10px_purple]" />
              )}
            </div>
          )
        })}
      </div>

      {/* Selected Day Agenda */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-white/[0.01]">
        <div className="px-6 py-4 flex items-center justify-between border-b theme-border sticky top-0 theme-bg/80 backdrop-blur-md z-10">
          <div className="flex flex-col">
            <span className="text-[10px] font-black theme-muted uppercase tracking-widest">
              {format(selectedDay, 'yyyy年 M月 d日', { locale: ja })}
            </span>
            <span className="text-lg font-black theme-text">
              {format(selectedDay, 'eeee', { locale: ja })}の予定
            </span>
          </div>
          <button 
            onClick={() => onAddEvent(selectedDay)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all active:scale-95 theme-text border theme-border"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {eventsByDay[format(selectedDay, 'yyyy-MM-dd')]?.map(event => (
            <button
              key={event.id}
              onClick={() => onEditEvent(event)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 border theme-border hover:theme-elevated transition-all active:scale-[0.98] group text-left"
            >
              <div 
                className="w-1.5 h-10 rounded-full shrink-0" 
                style={{ backgroundColor: event.color }}
              />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold theme-text truncate group-hover:text-purple-400 transition-colors">
                  {event.title}
                </h4>
                <div className="flex items-center gap-3 mt-1 text-xs theme-muted font-bold">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {event.is_all_day ? '終日' : `${format(parseISO(event.start_at), 'H:mm')} - ${format(parseISO(event.end_at), 'H:mm')}`}
                  </div>
                  {event.profiles?.display_name && (
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      {event.profiles.display_name}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="w-5 h-5 theme-muted group-hover:theme-text transition-all" />
            </button>
          )) || (
            <div className="py-12 flex flex-col items-center justify-center theme-muted text-sm italic">
              <Calendar className="w-12 h-12 mb-3 opacity-20" />
              予定はありません
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

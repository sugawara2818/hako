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
  eachDayOfInterval,
  isToday,
  parseISO
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Clock, User as UserIcon, Calendar, ArrowLeft } from 'lucide-react'
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
  const [isDayViewOpen, setIsDayViewOpen] = useState(false)

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

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    setIsDayViewOpen(true)
  }

  return (
    <div id="calendar-view-container" className="flex flex-col h-full theme-bg select-none overflow-hidden relative">
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
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <div className="grid grid-cols-7 border-b theme-border">
          {days.map((day, i) => {
            const dateKey = format(day, 'yyyy-MM-dd')
            const dayEvents = eventsByDay[dateKey] || []
            const isCurrentMonth = isSameMonth(day, currentMonth)
            const isTodayDate = isToday(day)
            const isSelected = isSameDay(day, selectedDay)

            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={`min-h-[90px] md:min-h-[120px] p-1 md:p-2 border-r border-b theme-border transition-all cursor-pointer group relative ${!isCurrentMonth ? 'opacity-20' : ''} ${isSelected ? 'theme-elevated' : 'hover:theme-elevated/50'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[10px] md:text-xs font-black w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full transition-colors ${
                    isTodayDate ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 
                    isSelected ? 'theme-text ring-1 ring-purple-500/50' :
                    i % 7 === 0 ? 'text-red-400' :
                    i % 7 === 6 ? 'text-blue-400' :
                    'theme-text opacity-70'
                  }`}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="flex flex-col gap-0.5 overflow-hidden">
                  {dayEvents.slice(0, 3).map(event => (
                    <div 
                      key={event.id}
                      className="px-1.5 py-0.5 rounded-sm text-[8px] md:text-[10px] truncate theme-text font-bold"
                      style={{ backgroundColor: `${event.color}20`, borderLeft: `2px solid ${event.color}` }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-[8px] md:text-[10px] theme-muted font-bold pl-1">
                      他 {dayEvents.length - 3} 件
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Full-Screen Day View Overlay */}
      {isDayViewOpen && (
        <div className="fixed inset-0 z-[150] flex flex-col theme-bg animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-4 px-6 py-4 border-b theme-border">
            <button 
              onClick={() => setIsDayViewOpen(false)}
              className="p-2 -ml-2 hover:theme-elevated rounded-xl transition-all theme-text"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black theme-muted uppercase tracking-widest">
                {format(selectedDay, 'yyyy年 M月 d日', { locale: ja })}
              </span>
              <span className="text-xl font-black theme-text">
                {format(selectedDay, 'eeee', { locale: ja })}
              </span>
            </div>
            <div className="flex-1" />
            <button 
              onClick={() => onAddEvent(selectedDay)}
              className="p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4 pb-24">
            {(eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || [])
              .sort((a, b) => a.start_at.localeCompare(b.start_at))
              .map(event => (
              <button
                key={event.id}
                onClick={() => onEditEvent(event)}
                className="w-full flex items-center gap-4 p-5 rounded-3xl theme-elevated border theme-border hover:border-purple-500/30 transition-all active:scale-[0.98] group text-left shadow-lg shadow-black/5"
              >
                <div 
                  className="w-1.5 h-12 rounded-full shrink-0" 
                  style={{ backgroundColor: event.color }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="text-lg font-bold theme-text truncate group-hover:text-purple-400 transition-colors">
                    {event.title}
                  </h4>
                  <div className="flex items-center gap-4 mt-1.5 text-sm theme-muted font-bold">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-purple-500" />
                      {event.is_all_day ? '終日' : `${format(parseISO(event.start_at), 'H:mm')} - ${format(parseISO(event.end_at), 'H:mm')}`}
                    </div>
                    {event.profiles?.display_name && (
                      <div className="flex items-center gap-1.5">
                        <UserIcon className="w-4 h-4 text-pink-500" />
                        {event.profiles.display_name}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 theme-muted group-hover:theme-text transition-all" />
              </button>
            )) || (
              <div className="py-20 flex flex-col items-center justify-center theme-muted text-lg italic">
                <Calendar className="w-20 h-20 mb-6 opacity-10" />
                この日の予定はありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

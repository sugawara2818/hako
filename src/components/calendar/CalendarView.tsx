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
        <div className="grid grid-cols-7 border-b theme-border min-h-full">
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

          {/* All Day Events (Fixed below header) */}
          {(() => {
            const allDayEvents = (eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || []).filter(e => e.is_all_day)
            if (allDayEvents.length === 0) return null
            return (
              <div className="z-20 theme-surface border-b theme-border px-6 py-3 flex flex-wrap gap-2 shrink-0">
                <div className="text-[9px] font-black theme-muted uppercase tracking-[0.2em] w-full mb-1 opacity-50">終日の予定</div>
                {allDayEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEditEvent(event)}
                    className="px-3 py-1.5 rounded-lg theme-elevated border theme-border flex items-center gap-2 max-w-full hover:theme-elevated/80 transition-all shadow-sm"
                    style={{ borderLeft: `3px solid ${event.color}` }}
                  >
                    <span className="text-xs font-bold theme-text truncate">{event.title}</span>
                  </button>
                ))}
              </div>
            )
          })()}

          <div className="flex-1 overflow-y-auto relative no-scrollbar">
            <div className="flex min-h-full">
              {/* Time Axis */}
              <div className="w-14 shrink-0 border-r theme-border pt-4">
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={hour} className="h-20 text-[10px] theme-muted font-bold text-center pr-2">
                    {hour === 0 ? '' : `${hour}:00`}
                  </div>
                ))}
              </div>

              {/* Timeline Content */}
              <div className="flex-1 relative">
                {/* Hour Lines - Ultra-subtle styling */}
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div 
                    key={hour} 
                    className="absolute left-0 right-0 border-t theme-border opacity-[0.08] h-20 pointer-events-none" 
                    style={{ top: `${hour * 80}px`, borderTopWidth: '0.5px' }} 
                  />
                ))}

                {/* Events */}
                <div className="relative h-[1920px]">
                  {(() => {
                    const dayEvents = (eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || [])
                      .filter(e => !e.is_all_day)
                      .sort((a, b) => a.start_at.localeCompare(b.start_at))

                    return dayEvents.map((event) => {
                      const startDate = parseISO(event.start_at)
                      const endDate = parseISO(event.end_at)
                      const startMinutes = startDate.getHours() * 60 + startDate.getMinutes()
                      const durationMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
                      
                      const top = (startMinutes / 60) * 80
                      const height = Math.max((durationMinutes / 60) * 80 - 2, 24)

                      return (
                        <button
                          key={event.id}
                          onClick={() => onEditEvent(event)}
                          className="absolute left-1 right-2 p-1.5 rounded-md border theme-border theme-elevated shadow-sm hover:theme-elevated/80 transition-all active:scale-[0.99] group text-left overflow-hidden z-10"
                          style={{ 
                            top: `${top + 2}px`, 
                            height: `${height}px`,
                            borderLeft: `3px solid ${event.color}`,
                            backgroundColor: `${event.color}15`
                          }}
                        >
                          <h4 className="text-[11px] font-bold theme-text leading-tight truncate">
                            {event.title}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5 text-[9px] theme-muted font-medium">
                            {format(startDate, 'H:mm')} - {format(endDate, 'H:mm')}
                          </div>
                        </button>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

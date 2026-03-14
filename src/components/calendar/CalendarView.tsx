'use client'

import React, { useState, useMemo, useEffect, useTransition } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isToday,
  eachDayOfInterval,
  parseISO,
  addDays,
  addWeeks,
  addYears,
  differenceInDays,
  startOfToday,
  startOfDay,
  subMinutes,
  isBefore,
  isAfter,
  isSameDay
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Clock, User as UserIcon, Calendar, ArrowLeft, LayoutGrid, CalendarDays, CalendarRange, Calendar as CalendarIcon } from 'lucide-react'
import { CalendarEvent } from '@/core/calendar/actions'

interface CalendarViewProps {
  hakoId: string
  initialEvents: CalendarEvent[]
  onAddEvent: (date: Date) => void
  onEditEvent: (event: CalendarEvent) => void
  onMoveEvent?: (event: CalendarEvent, newStart: Date, newEnd: Date) => void
}

export function CalendarView({ hakoId, initialEvents, onAddEvent, onEditEvent, onMoveEvent }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState(new Date())
  const [isDayViewOpen, setIsDayViewOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day' | 'year'>('month')
  const [nowPosition, setNowPosition] = useState(0)
  
  // Drag and Drop State
  const [draggingEvent, setDraggingEvent] = useState<CalendarEvent | null>(null)
  const [dragOffset, setDragOffset] = useState(0)
  const [dragCurrentTop, setDragCurrentTop] = useState(0)
  
  // Slide Animation State
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | 'none'>('none')
  const [animationKey, setAnimationKey] = useState(Date.now())
  const [view, setView] = useState<'timeline' | 'list'>('timeline')
  const timelineRef = React.useRef<HTMLDivElement>(null)
  
  // Swipe Gesture State
  const [touchStart, setTouchStart] = useState<{ x: number, y: number } | null>(null)
  const minSwipeDistance = 50

  // Current time indicator logic
  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const startOfDayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      const minutesSinceStart = (now.getTime() - startOfDayTime) / (1000 * 60)
      setNowPosition(minutesSinceStart)
    }
    updatePosition()
    const interval = setInterval(updatePosition, 60000)
    return () => clearInterval(interval)
  }, [])

  // Global listeners for drag stability
  useEffect(() => {
    if (!draggingEvent) return

    const handleGlobalMove = (clientY: number) => {
      if (!timelineRef.current) return
      const rect = timelineRef.current.getBoundingClientRect()
      
      // rect.top is the top of the timeline content IN THE VIEWPORT.
      // e.clientY - rect.top is the position within the timeline content.
      // Subtract 24px (pt-6) to align y=0 with 0:00
      const y = clientY - rect.top - 24
      
      const rawMinutes = (y - dragOffset)
      const snappedMinutes = Math.max(0, Math.min(23.75 * 60, Math.round(rawMinutes / 15) * 15))
      setDragCurrentTop(snappedMinutes)
    }

    const handleGlobalEnd = () => {
      if (!draggingEvent) return;
      const minutes = dragCurrentTop
      const newStartDate = new Date(selectedDay)
      newStartDate.setHours(Math.floor(minutes / 60), Math.round(minutes % 60), 0, 0)
      
      const oldStart = parseISO(draggingEvent.start_at)
      const oldEnd = parseISO(draggingEvent.end_at)
      const duration = oldEnd.getTime() - oldStart.getTime()
      const newEndDate = new Date(newStartDate.getTime() + duration)
      
      onMoveEvent?.(draggingEvent, newStartDate, newEndDate)
      setDraggingEvent(null)
    }

    const onMouseMove = (e: MouseEvent) => handleGlobalMove(e.clientY)
    const onTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault()
      handleGlobalMove(e.touches[0].clientY)
    }
    const onMouseUp = () => handleGlobalEnd()
    const onTouchEnd = () => handleGlobalEnd()

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [draggingEvent, dragOffset, dragCurrentTop, selectedDay, onMoveEvent])
  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const nextMonth = () => {
    setSlideDirection('right')
    setAnimationKey(Date.now())
    setCurrentMonth(addMonths(currentMonth, 1))
  }
  const prevMonth = () => {
    setSlideDirection('left')
    setAnimationKey(Date.now())
    setCurrentMonth(subMonths(currentMonth, 1))
  }
  const nextWeek = () => {
    setSlideDirection('right')
    setAnimationKey(Date.now())
    setCurrentMonth(addWeeks(currentMonth, 1))
  }
  
  const prevWeek = () => {
    setSlideDirection('left')
    setAnimationKey(Date.now())
    setCurrentMonth(addWeeks(currentMonth, -1))
  }
  
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY
    }
    
    const distanceX = touchStart.x - touchEnd.x
    const distanceY = touchStart.y - touchEnd.y
    const isHorizontalSwipe = Math.abs(distanceX) > Math.abs(distanceY)
    
    if (isHorizontalSwipe && Math.abs(distanceX) > minSwipeDistance) {
      if (distanceX > 0) {
          // Swipe Left -> Next
          if (viewMode === 'month') nextMonth()
          else if (viewMode === 'week') {
              setSlideDirection('right')
              setAnimationKey(Date.now())
              setCurrentMonth(addWeeks(currentMonth, 1))
          }
      } else {
          // Swipe Right -> Prev
          if (viewMode === 'month') prevMonth()
          else if (viewMode === 'week') {
              setSlideDirection('left')
              setAnimationKey(Date.now())
              setCurrentMonth(addWeeks(currentMonth, -1))
          }
      }
    }
    setTouchStart(null)
  }

  const eventsByDay = useMemo(() => {
    let rangeStart: Date;
    let rangeEnd: Date;
    
    if (viewMode === 'month') {
        rangeStart = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
        rangeEnd = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });
    } else if (viewMode === 'week') {
        rangeStart = startOfWeek(currentMonth, { weekStartsOn: 0 });
        rangeEnd = endOfWeek(currentMonth, { weekStartsOn: 0 });
    } else if (viewMode === 'year') {
        rangeStart = new Date(currentMonth.getFullYear(), 0, 1);
        rangeEnd = new Date(currentMonth.getFullYear(), 11, 31, 23, 59, 59);
    } else {
        rangeStart = subMonths(currentMonth, 1);
        rangeEnd = addMonths(currentMonth, 1);
    }

    const map: Record<string, (CalendarEvent & { slot?: number; isStart?: boolean; isEnd?: boolean })[]> = {}
    const intervalDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
    
    // Slot tracks: Map<slotIndex, lastBusyDate>
    const slots: Record<number, string> = {};

    // First, handle all events and sort by start time and duration (longer first for better layout)
    const sortedEvents = [...initialEvents].filter(e => !e.id.includes('_')).sort((a, b) => {
      const startA = parseISO(a.start_at).getTime();
      const startB = parseISO(b.start_at).getTime();
      if (startA !== startB) return startA - startB;
      const durationA = parseISO(a.end_at).getTime() - startA;
      const durationB = parseISO(b.end_at).getTime() - startB;
      return durationB - durationA; // Longer events first
    });

    sortedEvents.forEach(event => {
      const startAt = parseISO(event.start_at);
      const endAt = parseISO(event.end_at);
      
      // Calculate effective ranges
      if (!event.recurrence_rule) {
        let current = startOfDay(startAt);
        const effectiveEnd = (endAt.getHours() === 0 && endAt.getMinutes() === 0 && !isSameDay(startAt, endAt))
            ? subMinutes(endAt, 1)
            : endAt;
        const lastDay = startOfDay(effectiveEnd);
        
        if (lastDay < rangeStart || current > rangeEnd) return;

        // Slot assignment (for month view consistency)
        let slot = 0;
        if (viewMode === 'month') {
          while (slots[slot] && parseISO(slots[slot]) >= current) {
            slot++;
          }
          slots[slot] = format(lastDay, 'yyyy-MM-dd');
        }

        let temp = current;
        while (temp <= lastDay && temp <= rangeEnd) {
          if (temp >= rangeStart || isSameDay(temp, rangeStart)) {
            const dateKey = format(temp, 'yyyy-MM-dd')
            if (!map[dateKey]) map[dateKey] = []
            
            map[dateKey].push({
              ...event,
              id: `${event.id}_${dateKey}`,
              realId: event.id,
              slot,
              isStart: isSameDay(temp, startAt),
              isEnd: isSameDay(temp, lastDay)
            });
          }
          temp = addDays(temp, 1);
        }
        return;
      }

      // Handle recurrence
      let current = new Date(startAt);
      const duration = endAt.getTime() - startAt.getTime();
      let safetyCounter = 0;
      while (current <= rangeEnd && safetyCounter < 1000) {
        safetyCounter++;
        const dateKey = format(current, 'yyyy-MM-dd');
        const isPastUntil = event.recurrence_until && isAfter(current, parseISO(event.recurrence_until));
        const isExcluded = event.excluded_dates && event.excluded_dates.includes(dateKey);

        if (!isPastUntil && !isExcluded && (current >= rangeStart || isSameDay(current, rangeStart))) {
          if (!map[dateKey]) map[dateKey] = []
          map[dateKey].push({
            ...event,
            id: `${event.id}_${dateKey}`,
            realId: event.id,
            start_at: current.toISOString(),
            end_at: new Date(current.getTime() + duration).toISOString(),
            isStart: true, // Recurrence items are usually daily "start" units unless redefined
            isEnd: true
          });
        }
        
        if (event.recurrence_rule === 'daily') current = addDays(current, 1);
        else if (event.recurrence_rule === 'weekly') current = addWeeks(current, 1);
        else if (event.recurrence_rule === 'monthly') current = addMonths(current, 1);
        else if (event.recurrence_rule === 'yearly') current = addYears(current, 1);
        else break;
      }
    })

    // Final sort within each day by slot
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0));
    });

    return map
  }, [initialEvents, currentMonth, viewMode])

  const handleDayClick = (day: Date) => {
    setSelectedDay(day)
    setIsDayViewOpen(true)
  }

  return (
    <div 
        id="calendar-view-container" 
        className="flex flex-col h-full theme-bg select-none overflow-hidden relative overscroll-none touch-pan-x"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{ height: '100%' }}
    >
      {/* Header - Glassmorphism */}
      <div className="px-6 py-8 border-b theme-border space-y-8 bg-white/[0.01] backdrop-blur-md">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-4xl font-black theme-text tracking-tighter">
            {viewMode === 'year' ? format(currentMonth, 'yyyy年') : format(currentMonth, 'yyyy年 MM月', { locale: ja })}
          </h2>
          <div className="flex items-center gap-1 bg-white/[0.03] p-1.5 rounded-2xl border theme-border shadow-inner">
            <button onClick={prevMonth} className="p-2.5 hover:theme-elevated rounded-xl transition-all active:scale-95 theme-muted hover:theme-text">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => setCurrentMonth(new Date())} className="px-4 py-2 hover:theme-elevated rounded-xl transition-all active:scale-95 theme-text font-bold text-sm">
              今日
            </button>
            <button onClick={nextMonth} className="p-2.5 hover:theme-elevated rounded-xl transition-all active:scale-95 theme-muted hover:theme-text">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
            <div className="flex bg-white/[0.03] p-1.5 rounded-2xl border theme-border shadow-inner">
              {(['month', 'week', 'year'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    viewMode === mode 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 active:scale-95' 
                      : 'theme-muted hover:theme-text'
                  }`}
                >
                  {mode === 'month' ? '月' : mode === 'week' ? '週' : '年'}
                </button>
              ))}
            </div>
            
            <button 
                onClick={() => onAddEvent(new Date())}
                className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 hover:scale-105 active:scale-90 transition-all"
            >
                <Plus className="w-8 h-8 font-black" />
            </button>
        </div>
      </div>

      <div 
        key={animationKey}
        className={`flex-1 min-h-0 overflow-hidden ${
          slideDirection === 'right' ? 'animate-slide-in-right' : 
          slideDirection === 'left' ? 'animate-slide-in-left' : ''
        }`}
        onAnimationEnd={() => setSlideDirection('none')}
      >
        {viewMode === 'month' && (
          <div className="flex flex-col h-full">
            <div className="grid grid-cols-7 border-b theme-border bg-white/[0.01]">
              {['日', '月', '火', '水', '木', '金', '土'].map((day, i) => (
                <div key={day} className={`py-2 md:py-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest ${i === 0 ? 'text-red-400/70' : i === 6 ? 'text-blue-400/70' : 'theme-muted'}`}>
                  {day}
                </div>
              ))}
            </div>
            <div className={`flex-1 grid grid-cols-7 border-b theme-border min-h-0 ${days.length > 35 ? 'grid-rows-6' : 'grid-rows-5'}`}>
              {days.map((day: Date, i: number) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayEvents = eventsByDay[dateKey] || []
                const isCurrentMonth = isSameMonth(day, currentMonth)
                const isTodayDate = isToday(day)
                const isSelected = isSameDay(day, selectedDay)

                return (
                  <div 
                    key={day.toString()} 
                    onClick={() => handleDayClick(day)}
                    className={`min-h-0 border-r border-b theme-border transition-colors cursor-pointer group relative flex flex-col ${!isCurrentMonth ? 'opacity-10 pointer-events-none' : 'hover:bg-black/[0.01] dark:hover:bg-white/[0.01]'}`}
                  >
                    <div className="flex items-center p-2">
                      <span className={`text-[11px] font-black w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-xl transition-all ${
                        isTodayDate ? 'bg-gradient-to-br from-blue-600 to-blue-400 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-500/20' : 
                        isSelected ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                        i % 7 === 0 ? 'text-red-400/80 font-black' :
                        i % 7 === 6 ? 'text-blue-400/80 font-black' :
                        'theme-text opacity-30'
                      }`}>
                        {format(day, 'd')}
                      </span>
                    </div>
                    
                    <div className="flex flex-col gap-1 w-full relative">
                      {[0, 1, 2, 3].map(slotIndex => {
                        const event = dayEvents.find(e => e.slot === slotIndex);
                        if (!event) return <div key={slotIndex} className="h-5 md:h-6" />; 

                        return (
                          <button 
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                            className={`px-3 text-[9px] md:text-[10px] truncate text-white font-bold flex items-center transition-all hover:brightness-110 active:scale-[0.98] ${
                              event.isStart ? 'rounded-l-lg ml-1' : '-ml-[1px]'
                            } ${
                              event.isEnd ? 'rounded-r-lg mr-1' : '-mr-[1px]'
                            }`}
                            style={{ 
                              backgroundColor: event.color || '#3b82f6',
                              zIndex: 10,
                              height: '24px',
                            }}
                          >
                            {(event.isStart || (i % 7 === 0)) && (
                               <span className="truncate">{event.title}</span>
                            )}
                          </button>
                        );
                      })}
                      {dayEvents.filter(e => (e.slot ?? 99) > 3).length > 0 && (
                        <div className="text-[9px] theme-muted font-bold px-3 py-1 opacity-50">
                          他 {dayEvents.filter(e => (e.slot ?? 99) > 3).length}件
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b theme-border bg-white/[0.01]">
                <div className="border-r theme-border" />
                {(() => {
                    const start = startOfWeek(currentMonth, { weekStartsOn: 0 })
                    return Array.from({ length: 7 }).map((_, i) => {
                        const day = new Date(start)
                        day.setDate(start.getDate() + i)
                        const isT = isToday(day)
                        return (
                            <div key={i} className={`py-2 text-center border-r theme-border last:border-r-0 ${isT ? 'bg-blue-500/5' : ''}`}>
                                <div className="text-[8px] font-black theme-muted uppercase tracking-widest">{format(day, 'eee', { locale: ja })}</div>
                                <div className={`text-sm font-black mx-auto w-7 h-7 flex items-center justify-center rounded-full ${isT ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'theme-text'}`}>
                                    {format(day, 'd')}
                                </div>
                            </div>
                        )
                    })
                })()}
            </div>
            <div className="flex-1 overflow-y-auto no-scrollbar relative min-h-0 pb-24">
                <div className="flex min-h-[1200px]">
                    {/* Time Axis */}
                    <div className="w-14 shrink-0 border-r theme-border pt-4 bg-white/[0.02]">
                        {Array.from({ length: 25 }).map((_, hour) => (
                            <div key={hour} className="h-[60px] text-[10px] theme-muted font-bold text-center pr-2">
                                {hour === 0 ? '' : hour === 24 ? '24:00' : `${hour}:00`}
                            </div>
                        ))}
                    </div>

                    {/* Timeline Grid */}
                    <div className="flex-1 grid grid-cols-7 relative">
                        {/* Hour Lines */}
                        {Array.from({ length: 25 }).map((_, hour) => (
                            <div 
                                key={hour} 
                                className="absolute left-0 right-0 border-t theme-border opacity-30 h-[60px] pointer-events-none" 
                                style={{ top: `${hour * 60}px` }} 
                            />
                        ))}

                        {/* Day Columns */}
                        {(() => {
                            const start = startOfWeek(currentMonth, { weekStartsOn: 0 })
                            return Array.from({ length: 7 }).map((_, dayIndex) => {
                                const dayDate = new Date(start)
                                dayDate.setDate(start.getDate() + dayIndex)
                                const dayStr = format(dayDate, 'yyyy-MM-dd')
                                const dayEvents = (eventsByDay[dayStr] || []).filter(e => !e.is_all_day)
                                
                                return (
                                    <div key={dayIndex} className="relative border-r theme-border last:border-r-0 hover:bg-white/[0.01] transition-colors cursor-pointer" onClick={() => handleDayClick(dayDate)}>
                                        {isToday(dayDate) && (
                                            <div 
                                                className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                                                style={{ top: `${nowPosition}px` }}
                                            >
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 -ml-[3px]" />
                                                <div className="flex-1 h-[1px] bg-blue-500" />
                                            </div>
                                        )}
                                        {dayEvents.map(event => {
                                            const sDate = parseISO(event.start_at)
                                            const eDate = parseISO(event.end_at)
                                            
                                            // Calculate start/end minutes for THIS specific day column
                                            const isStartsBefore = isBefore(sDate, dayDate) && !isSameDay(sDate, dayDate)
                                            const isEndsAfter = isAfter(eDate, addDays(dayDate, 1)) || (isAfter(eDate, dayDate) && !isSameDay(eDate, dayDate) && (eDate.getHours() !== 0 || eDate.getMinutes() !== 0))
                                            
                                            const s = isStartsBefore ? 0 : sDate.getHours() * 60 + sDate.getMinutes()
                                            let e = isEndsAfter ? 1440 : eDate.getHours() * 60 + eDate.getMinutes()
                                            
                                            // Handle midnight endings
                                            if (e === 0 && eDate.getDate() !== sDate.getDate()) {
                                                e = 1440
                                            }
                                            
                                            const t = s
                                            const h = Math.max((e - s) - 2, 20)
                                            
                                            return (
                                                <button
                                                    key={event.id}
                                                    onClick={(e) => { e.stopPropagation(); onEditEvent(event); }}
                                                    className="absolute p-2 rounded-lg border theme-border group text-left overflow-hidden transition-all hover:opacity-80 active:scale-[0.98]"
                                                    style={{ 
                                                        top: `${t + 2}px`, 
                                                        height: `${h}px`,
                                                        borderLeft: `4px solid ${event.color || '#3b82f6'}`,
                                                        backgroundColor: event.color ? `${event.color}15` : `rgba(59, 130, 246, 0.1)`,
                                                    }}
                                                >
                                                    <div className="text-[10px] font-bold theme-text leading-tight truncate">{event.title}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })
                        })()}
                    </div>
                </div>
            </div>
          </div>
        )}

        {viewMode === 'year' && (
          <div className="p-4 md:p-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {Array.from({ length: 12 }).map((_, monthIndex) => {
              const monthDate = new Date(currentMonth.getFullYear(), monthIndex, 1)
              const monthStart = startOfMonth(monthDate)
              const monthEnd = endOfMonth(monthDate)
              const startWeek = startOfWeek(monthStart)
              const endWeek = endOfWeek(monthEnd)
              const monthDays = eachDayOfInterval({ start: startWeek, end: endWeek })

              return (
                <div key={monthIndex} className="space-y-4">
                  <h3 className="text-sm font-black theme-text px-1 flex items-center justify-between">
                    <span>{format(monthDate, 'M月', { locale: ja })}</span>
                    <span className="text-[10px] opacity-40 font-bold uppercase tracking-wider">{format(monthDate, 'MMM', { locale: ja })}</span>
                  </h3>
                  <div className="grid grid-cols-7 gap-1">
                    {['日', '月', '火', '水', '木', '金', '土'].map(d => (
                      <div key={d} className="text-[8px] font-black theme-muted text-center py-1 opacity-50">{d}</div>
                    ))}
                    {monthDays.map(day => {
                      const isCurrentM = isSameMonth(day, monthDate)
                      const hasEvent = eventsByDay[format(day, 'yyyy-MM-dd')]?.length > 0
                      const isT = isToday(day)

                      return (
                        <div 
                          key={day.toString()}
                          onClick={() => {
                            setCurrentMonth(monthDate)
                            setSelectedDay(day)
                            setViewMode('month')
                          }}
                          className={`aspect-square flex items-center justify-center text-[9px] font-bold rounded-full cursor-pointer transition-all relative ${!isCurrentM ? 'opacity-0 pointer-events-none' : 'hover:theme-elevated'} ${isT ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'theme-text opacity-70'}`}
                        >
                          {format(day, 'd')}
                          {isCurrentM && hasEvent && !isT && (
                            <div className="absolute bottom-0.5 w-0.5 h-0.5 rounded-full bg-blue-500 scale-125" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
            <div className="flex bg-black/[0.03] dark:bg-white/[0.03] p-1 rounded-2xl mr-2">
              {(['timeline', 'list'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                    view === v 
                      ? 'theme-surface theme-text shadow-sm ring-1 ring-black/5 dark:ring-white/10' 
                      : 'theme-muted hover:theme-text'
                  }`}
                >
                  {v === 'timeline' ? '24時間' : 'リスト'}
                </button>
              ))}
            </div>
            <button 
              onClick={() => onAddEvent(selectedDay)}
              className="p-3 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-2xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
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
                <div className="flex flex-col gap-1 w-full">
                  {allDayEvents.map(event => (
                    <button
                      key={event.id}
                      onClick={() => onEditEvent(event)}
                      className="w-full px-4 py-3 rounded-2xl theme-surface border theme-border flex items-center gap-3 hover:bg-white/5 transition-all group"
                      style={{ borderLeft: `4px solid ${event.color || '#3b82f6'}`, backgroundColor: event.color ? `${event.color}10` : `rgba(59, 130, 246, 0.05)` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: event.color || '#3b82f6' }} />
                      <span className="text-sm font-bold theme-text truncate">{event.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })()}

          <div className="flex-1 overflow-hidden flex flex-col">
            {view === 'timeline' ? (
              <div className="flex-1 overflow-y-auto relative no-scrollbar px-1 pb-24">
                <div 
                  ref={timelineRef}
                  className="flex min-h-full"
                >
              {/* Time Axis */}
              <div className="w-14 shrink-0 border-r theme-border pt-6 z-10 theme-bg">
                {Array.from({ length: 24 }).map((_, hour) => (
                  <div key={hour} className="h-[60px] relative">
                    <div className="absolute top-0 left-0 right-0 text-[10px] theme-muted font-bold text-center pr-2 -translate-y-1/2 bg-inherit">
                        {hour === 0 ? '0:00' : `${hour}:00`}
                    </div>
                  </div>
                ))}
                {/* 24:00 label at the bottom */}
                <div className="h-0 relative">
                  <div className="absolute top-0 left-0 right-0 text-[10px] theme-muted font-bold text-center pr-2 -translate-y-1/2 bg-inherit">
                    24:00
                  </div>
                </div>
              </div>

              {/* Timeline Content */}
              <div 
                className="flex-1 relative pt-6"
                style={{
                  backgroundImage: `
                    linear-gradient(to bottom, 
                      var(--calendar-grid-hour) 0px, var(--calendar-grid-hour) 1px, transparent 1px,
                      transparent 15px, var(--calendar-grid-quarter) 15px, var(--calendar-grid-quarter) 16px, transparent 16px,
                      transparent 30px, var(--calendar-grid-quarter) 30px, var(--calendar-grid-quarter) 31px, transparent 31px,
                      transparent 45px, var(--calendar-grid-quarter) 45px, var(--calendar-grid-quarter) 46px, transparent 46px,
                      transparent 60px
                    )
                  `,
                  backgroundSize: '100% 60px',
                  backgroundPosition: '0 24px',
                  backgroundRepeat: 'repeat-y',
                }}
                onClick={(e) => {
                   if (draggingEvent) return;
                   const rect = e.currentTarget.getBoundingClientRect();
                   const y = e.clientY - rect.top - 24; // Subtract pt-6
                   
                   // Snap to 15 minutes and clamp
                   const rawMinutes = y;
                   const snappedMinutes = Math.max(0, Math.min(23.75 * 60, Math.round(rawMinutes / 15) * 15));
                   
                   const clickedTime = new Date(selectedDay);
                   clickedTime.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);
                   onAddEvent(clickedTime);
                }}
              >

                {/* Current Time Indicator */}
                {isToday(selectedDay) && (
                  <div 
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: `${nowPosition + 24}px` }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 -ml-0.5" />
                    <div className="flex-1 h-[1.5px] bg-blue-500/50" />
                  </div>
                )}

                {/* Events Container */}
                <div className="relative h-[1440px]">
                  {(() => {
                    const dayEvents = (eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || [])
                      .filter(e => !e.is_all_day)
                      .sort((a, b) => a.start_at.localeCompare(b.start_at))

                    const eventPositions: Array<{
                      event: CalendarEvent;
                      top: number;
                      height: number;
                      left: number;
                      width: number;
                    }> = [];

                    const columns: Array<Array<{ start: number; end: number }>> = [];

                    dayEvents.forEach(event => {
                      const startDate = parseISO(event.start_at)
                      const endDate = parseISO(event.end_at)
                      
                      // Calculate for this specific day (selectedDay)
                      const isStartsBefore = isBefore(startDate, selectedDay) && !isSameDay(startDate, selectedDay)
                      const isEndsAfter = isAfter(endDate, addDays(selectedDay, 1)) || (isAfter(endDate, selectedDay) && !isSameDay(endDate, selectedDay) && (endDate.getHours() !== 0 || endDate.getMinutes() !== 0))

                      const start = isStartsBefore ? 0 : startDate.getHours() * 60 + startDate.getMinutes()
                      let end = isEndsAfter ? 1440 : endDate.getHours() * 60 + endDate.getMinutes()

                      // Handle midnight endings
                      if (end === 0 && endDate.getDate() !== startDate.getDate()) {
                        end = 1440
                      }

                      const top = start
                      const height = Math.max((end - start) - 1, 15)

                      let colIndex = columns.findIndex(col => 
                        !col.some(e => (start < e.end && end > e.start))
                      );

                      if (colIndex === -1) {
                        colIndex = columns.length;
                        columns.push([{ start, end }]);
                      } else {
                        columns[colIndex].push({ start, end });
                      }

                      eventPositions.push({ event, top, height, left: colIndex, width: 0 });
                    });

                    return eventPositions.map((pos) => {
                      const totalCols = columns.length;
                      const width = 100 / totalCols;
                      const left = pos.left * width;
                      
                      const isDragging = draggingEvent?.id === pos.event.id
                      const displayTop = isDragging ? dragCurrentTop : pos.top

                      return (
                        <React.Fragment key={pos.event.id}>
                          {/* Ghost Placeholder */}
                          {isDragging && (
                            <div
                              className="absolute p-1.5 rounded-md border border-dashed border-white/20 bg-white/5 opacity-50 pointer-events-none z-0"
                              style={{ 
                                top: `${pos.top}px`, 
                                height: `${pos.height}px`,
                                left: `${left}%`,
                                width: `${width}%`,
                              }}
                            />
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onEditEvent(pos.event)
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation()
                              const rect = e.currentTarget.getBoundingClientRect()
                              const offset = e.clientY - rect.top
                              setDraggingEvent(pos.event)
                              setDragOffset(offset)
                              setDragCurrentTop(pos.top)
                            }}
                            onTouchStart={(e) => {
                              // e.stopPropagation() // Keep propagation to allow clicks if needed, but here we want drag
                              const rect = e.currentTarget.getBoundingClientRect()
                              const offset = e.touches[0].clientY - rect.top
                              setDraggingEvent(pos.event)
                              setDragOffset(offset)
                              setDragCurrentTop(pos.top)
                            }}
                            className={`absolute p-2 rounded-lg border theme-border group text-left overflow-hidden ${isDragging ? 'z-[100] scale-[1.02] shadow-2xl transition-none' : 'z-10 hover:opacity-80 transition-all active:scale-[0.98]'}`}
                            style={{ 
                              top: `${displayTop}px`, 
                              height: `${pos.height}px`,
                              left: `${left}%`,
                              width: `${width}%`,
                              borderLeft: `4px solid ${pos.event.color || '#3b82f6'}`,
                              backgroundColor: isDragging ? pos.event.color : (pos.event.color ? `${pos.event.color}15` : `rgba(59, 130, 246, 0.1)`),
                              color: isDragging ? '#fff' : 'inherit',
                              cursor: isDragging ? 'grabbing' : 'grab',
                              touchAction: 'none',
                              opacity: isDragging ? 0.9 : 1
                            }}
                          >
                            <h4 className={`text-[10px] font-bold leading-tight truncate pointer-events-none ${isDragging ? 'text-white' : 'theme-text'}`}>
                              {pos.event.title}
                            </h4>
                            {isDragging && (
                              <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" />
                            )}
                          </button>
                        </React.Fragment>
                      )
                    })
                  })()}
                </div>
              </div>
            </div>
          </div>
        ) : (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {(eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || [])
                  .sort((a, b) => a.start_at.localeCompare(b.start_at))
                  .map(event => (
                    <button
                      key={event.id}
                      onClick={() => onEditEvent(event)}
                      className="w-full p-4 rounded-xl theme-elevated border theme-border flex items-center justify-between hover:theme-elevated/80 transition-all text-left group"
                      style={{ borderLeft: `4px solid ${event.color}` }}
                    >
                      <div className="flex items-center gap-3">
                        {event.profiles?.avatar_url ? (
                          <img 
                            src={event.profiles.avatar_url} 
                            alt="" 
                            className="w-8 h-8 rounded-full border theme-border"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-white/5 border theme-border flex items-center justify-center">
                            <UserIcon className="w-4 h-4 opacity-40" />
                          </div>
                        )}
                        <div className="flex flex-col gap-0.5">
                          <h4 className="font-bold theme-text leading-tight">{event.title}</h4>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] theme-muted font-medium">
                              {event.profiles?.display_name || 'ユーザー'}
                            </span>
                            <div className="flex items-center gap-1 text-[10px] theme-muted">
                              <Clock className="w-3 h-3" />
                              {format(parseISO(event.start_at), 'H:mm')} - {format(parseISO(event.end_at), 'H:mm')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 theme-muted group-hover:theme-text transition-colors" />
                    </button>
                  ))}
                {(eventsByDay[format(selectedDay, 'yyyy-MM-dd')] || []).length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 theme-muted">
                    <Clock className="w-12 h-12 opacity-10 mb-4" />
                    <p className="text-sm font-bold opacity-40">予定はありません</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

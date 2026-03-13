'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { CalendarView } from '@/components/calendar/CalendarView'
import { EventModal } from '@/components/calendar/EventModal'
import { EventDetailModal } from '@/components/calendar/EventDetailModal'
import { 
  fetchCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  deleteRecurringOccurrence,
  deleteRecurringFuture,
  CalendarEvent 
} from '@/core/calendar/actions'
import { startOfMonth, endOfMonth, subMonths, addMonths, format, parseISO } from 'date-fns'

interface CalendarClientProps {
  hakoId: string
  currentUserId: string
  initialEvents: CalendarEvent[]
}

export function CalendarClient({ hakoId, currentUserId, initialEvents }: CalendarClientProps) {
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<{ 
    id: string, 
    isRecurring: boolean, 
    realId: string, 
    date?: string 
  } | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      const start = startOfMonth(subMonths(now, 1)).toISOString()
      const end = endOfMonth(addMonths(now, 2)).toISOString()
      const data = await fetchCalendarEvents(hakoId, start, end)
      // Safety: Strip any virtual metadata from backend data if it exists
      const cleanEvents = data.map(e => ({ ...e, id: e.realId || e.id, realId: undefined }))
      setEvents(cleanEvents)
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setLoading(false)
    }
  }, [hakoId])

  const handleAddEvent = (date: Date) => {
    setEditingEvent(null)
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleMoveEvent = async (event: CalendarEvent, newStart: Date, newEnd: Date) => {
    const oldEvents = [...events]
    const realId = (event as any).realId || event.id
    const isRecurring = !!(event as any).realId && (event as any).realId !== event.id

    setEvents(prev => prev.map(e => {
      // Always match by realId if available, and ensure resulting ID is the real one
      const eRealId = e.realId || e.id
      if (eRealId === realId) {
        return {
          ...e,
          id: realId, // Restore real ID
          start_at: newStart.toISOString(),
          end_at: newEnd.toISOString()
        }
      }
      return e
    }))

    try {
      if (isRecurring) {
        // Handle recurrence exception: exclude current date and create new one-off
        const originalDateStr = format(parseISO(event.start_at), 'yyyy-MM-dd')
        
        // 1. Exclude the occurrence
        const excludeResult = await deleteRecurringOccurrence(realId, hakoId, originalDateStr)
        if (!excludeResult.success) throw new Error(excludeResult.error)
        
        // 2. Create new independent event
        const createResult = await createCalendarEvent({
          hako_id: hakoId,
          title: event.title,
          description: event.description,
          start_at: newStart.toISOString(),
          end_at: newEnd.toISOString(),
          is_all_day: event.is_all_day,
          color: event.color,
          is_private: event.is_private,
          recurrence_rule: null,
          recurrence_until: null,
          excluded_dates: undefined
        })
        if (!createResult.success) throw new Error(createResult.error)
      } else {
        // Standard move for non-recurring events
        const result = await updateCalendarEvent(event.id, hakoId, {
          start_at: newStart.toISOString(),
          end_at: newEnd.toISOString()
        })
        if (!result.success) throw new Error(result.error)
      }
      
      // Revalidation in background
      await loadEvents()
    } catch (error) {
      console.error('Move event failed:', error)
      setEvents(oldEvents) // Rollback on failure
      alert('移動に失敗しました。元の位置に戻します。')
    }
  }

  const handleShowDetail = (event: CalendarEvent) => {
    setSelectedEvent(event)
    setIsDetailOpen(true)
  }

  const handleEditFromDetail = (event: CalendarEvent) => {
    setEditingEvent(event)
    setSelectedDate(undefined)
    setIsDetailOpen(false)
    setIsModalOpen(true)
  }

  const handleSaveEvent = async (eventData: any) => {
    try {
      let result: { success: boolean, data?: any, error?: string } | undefined;
      
      if (editingEvent) {
        const realId = editingEvent.realId || editingEvent.id;
        result = await updateCalendarEvent(realId, hakoId, eventData);
        if (result.success) {
          // Update local state immediately with real ID only
          setEvents(prev => prev.map(e => (e.realId || e.id) === realId ? { ...e, ...eventData, id: realId, realId: undefined } : e));
        }
      } else {
        result = await createCalendarEvent({
          ...eventData,
          hako_id: hakoId
        });
        if (result.success && result.data) {
          // Add to local state with real database ID
          setEvents(prev => [...prev, { ...result.data, id: result.data.id, realId: undefined }]);
        }
      }
      
      if (!result?.success) {
        throw new Error(result?.error || '保存に失敗しました');
      }

      await loadEvents();
    } catch (error) {
      console.error('Save event failed details:', error);
      throw error;
    }
  }

  const executeDelete = async (type: 'all' | 'one' | 'future' = 'all') => {
    if (!confirmDelete) return
    setLoading(true)
    try {
      const realId = confirmDelete.realId;
      const occurrenceDate = confirmDelete.date;

      let result;
      if (type === 'one' && occurrenceDate) {
        result = await deleteRecurringOccurrence(realId, hakoId, occurrenceDate)
      } else if (type === 'future' && occurrenceDate) {
        // Stop before this date. We actually set recurrence_until to the day BEFORE this one.
        const d = new Date(occurrenceDate);
        d.setDate(d.getDate() - 1);
        result = await deleteRecurringFuture(realId, hakoId, d.toISOString())
      } else {
        result = await deleteCalendarEvent(realId, hakoId)
      }

      if (result.success) {
        console.log('Delete successful, refreshing state...');
        setIsModalOpen(false)
        setIsDetailOpen(false)
        setConfirmDelete(null)
        await loadEvents()
      } else {
        alert(`削除に失敗しました: ${result.error}`)
      }
    } catch (error) {
      console.error('Delete failed:', error)
      alert('削除中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = (event: CalendarEvent) => {
    // Determine the true database ID and whether it's a recurring occurrence
    const isRecurring = !!event.recurrence_rule;
    const realId = event.realId || event.id;
    
    // For recurring events, we needs the occurrence date string (yyyy-MM-dd)
    // For non-recurring multi-day events, we don't strictly need it but we can set it
    const date = event.realId ? format(parseISO(event.start_at), 'yyyy-MM-dd') : undefined;
    
    console.log('handleDeleteEvent called:', { eventId: event.id, realId, isRecurring, date });
    
    setConfirmDelete({ 
        id: event.id, 
        isRecurring, 
        realId,
        date 
    });
  }

  return (
    <>
      <CalendarView 
        hakoId={hakoId}
        initialEvents={events}
        onAddEvent={handleAddEvent}
        onEditEvent={handleShowDetail}
        onMoveEvent={handleMoveEvent}
      />
      
      <EventDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        event={selectedEvent}
        currentUserId={currentUserId}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteEvent}
      />

      <EventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialDate={selectedDate}
        editingEvent={editingEvent}
        currentUserId={currentUserId}
      />
      
      {/* Custom Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setConfirmDelete(null)} />
          <div 
            className="relative w-full max-w-sm theme-surface border theme-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black theme-text mb-2">
              {(confirmDelete as any).isRecurring ? '繰り返し予定の削除' : '予定を削除しますか？'}
            </h3>
            <p className="theme-muted text-sm font-medium mb-6">
              {(confirmDelete as any).isRecurring 
                ? 'この予定は繰り返し設定されています。削除の範囲を選択してください。' 
                : 'この操作は取り消せません。'}
            </p>
            
            <div className="flex flex-col gap-3">
              {(confirmDelete as any).isRecurring ? (
                <>
                  <button 
                    onClick={() => executeDelete('one')}
                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all text-sm"
                  >
                    この予定のみ削除
                  </button>
                  <button 
                    onClick={() => executeDelete('future')}
                    className="w-full py-4 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all text-sm"
                  >
                    これ以降の予定をすべて削除
                  </button>
                  <button 
                    onClick={() => executeDelete('all')}
                    className="w-full py-4 bg-red-500 text-white hover:bg-red-600 rounded-2xl font-bold transition-all text-sm shadow-lg shadow-red-500/20"
                  >
                    すべての予定（シリーズ全体）を削除
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => executeDelete('all')}
                  className="w-full py-4 bg-red-500 text-white hover:bg-red-600 rounded-2xl font-bold transition-all text-sm"
                >
                  削除する
                </button>
              )}
              
              <button 
                onClick={() => setConfirmDelete(null)}
                className="w-full py-4 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 theme-text rounded-2xl font-bold transition-all text-sm mt-2"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-none">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </>
  )
}

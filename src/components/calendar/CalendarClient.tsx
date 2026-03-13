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
  const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      const start = startOfMonth(subMonths(now, 1)).toISOString()
      const end = endOfMonth(addMonths(now, 2)).toISOString()
      const data = await fetchCalendarEvents(hakoId, start, end)
      setEvents(data)
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
    const realId = (event as any).realId || event.id

    // Optimistic Update
    const oldEvents = [...events]
    setEvents(prev => prev.map(e => {
      if (e.id === event.id) {
        return {
          ...e,
          start_at: newStart.toISOString(),
          end_at: newEnd.toISOString()
        }
      }
      return e
    }))

    try {
      const result = await updateCalendarEvent(realId, hakoId, {
        start_at: newStart.toISOString(),
        end_at: newEnd.toISOString()
      })
      
      if (!result.success) {
        throw new Error(result.error)
      }
      // Revalidation in background
      const now = new Date()
      const start = startOfMonth(subMonths(now, 1)).toISOString()
      const end = endOfMonth(addMonths(now, 2)).toISOString()
      const data = await fetchCalendarEvents(hakoId, start, end)
      setEvents(data)
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
      let result;
      if (editingEvent) {
        const idToUpdate = (editingEvent as any).realId || editingEvent.id;
        result = await updateCalendarEvent(idToUpdate, hakoId, eventData)
      } else {
        result = await createCalendarEvent({
          ...eventData,
          hako_id: hakoId
        })
      }
      
      if (!result.success) {
        throw new Error(result.error)
      }

      await loadEvents()
    } catch (error) {
      console.error('Save event failed details:', error)
      throw error // Re-throw to inform EventModal
    }
  }

  const executeDelete = async (type: 'all' | 'one' | 'future' = 'all') => {
    if (!confirmDelete) return
    setLoading(true)
    try {
      const realId = (confirmDelete as any).realId || confirmDelete.id;
      const occurrenceDate = (confirmDelete as any).date;

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
        await loadEvents()
        setIsModalOpen(false)
        setIsDetailOpen(false)
        setConfirmDelete(null)
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
    const isRecurring = !!event.recurrence_rule;
    const realId = (event as any).realId || event.id;
    const date = (event as any).realId ? format(parseISO(event.start_at), 'yyyy-MM-dd') : undefined;
    
    setConfirmDelete({ 
        id: event.id, 
        isRecurring, 
        realId,
        date 
    } as any);
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
          <div className="relative w-full max-w-sm theme-surface border theme-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </>
  )
}

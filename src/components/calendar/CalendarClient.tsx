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
  CalendarEvent 
} from '@/core/calendar/actions'
import { startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'

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
        result = await updateCalendarEvent(editingEvent.id, hakoId, eventData)
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

  const handleDeleteEvent = (id: string) => {
    setConfirmDelete({ id })
  }

  const executeDelete = async () => {
    if (!confirmDelete) return
    setLoading(true)
    try {
      const result = await deleteCalendarEvent(confirmDelete.id, hakoId)
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

  return (
    <>
      <CalendarView 
        hakoId={hakoId}
        initialEvents={events}
        onAddEvent={handleAddEvent}
        onEditEvent={handleShowDetail}
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
          <div className="relative w-full max-w-sm bg-[#111] border theme-border rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black theme-text mb-2">予定を削除しますか？</h3>
            <p className="theme-muted text-sm font-medium mb-6">この操作は取り消せません。</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 theme-text rounded-2xl font-bold transition-all"
              >
                キャンセル
              </button>
              <button 
                onClick={executeDelete}
                className="flex-1 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl font-bold transition-all"
              >
                削除する
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

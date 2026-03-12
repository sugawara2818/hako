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

  const handleDeleteEvent = async (id: string) => {
    if (confirm('この予定を削除しますか？')) {
      const result = await deleteCalendarEvent(id, hakoId)
      if (result.success) {
        await loadEvents()
        setIsModalOpen(false)
        setIsDetailOpen(false)
      } else {
        alert(`削除に失敗しました: ${result.error}`)
      }
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
      
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </>
  )
}

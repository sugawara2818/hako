'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { CalendarView } from '@/components/calendar/CalendarView'
import { EventModal } from '@/components/calendar/EventModal'
import { 
  fetchCalendarEvents, 
  createCalendarEvent, 
  updateCalendarEvent, 
  deleteCalendarEvent,
  CalendarEvent 
} from '@/core/calendar/actions'
import { startOfMonth, endOfMonth, subMonths, addMonths, format } from 'date-fns'

export default function CalendarPage() {
  const params = useParams()
  const hakoId = params.hakoId as string
  
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      // Fetch a generous range (current month +/- 1 month)
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

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  const handleAddEvent = (date: Date) => {
    setEditingEvent(null)
    setSelectedDate(date)
    setIsModalOpen(true)
  }

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event)
    setSelectedDate(undefined)
    setIsModalOpen(true)
  }

  const handleSaveEvent = async (eventData: any) => {
    if (editingEvent) {
      await updateCalendarEvent(editingEvent.id, hakoId, eventData)
    } else {
      await createCalendarEvent({
        ...eventData,
        hako_id: hakoId
      })
    }
    await loadEvents()
  }

  const handleDeleteEvent = async (id: string) => {
    if (confirm('この予定を削除しますか？')) {
      await deleteCalendarEvent(id, hakoId)
      await loadEvents()
      setIsModalOpen(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-black">
      <CalendarView 
        hakoId={hakoId}
        initialEvents={events}
        onAddEvent={handleAddEvent}
        onEditEvent={handleEditEvent}
      />
      
      <EventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        initialDate={selectedDate}
        editingEvent={editingEvent}
      />
      
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none">
          <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

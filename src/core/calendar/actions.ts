'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CalendarEvent {
  id: string
  hako_id: string
  user_id: string
  title: string
  description?: string | null
  start_at: string
  end_at: string
  is_all_day: boolean
  color: string
  created_at: string
  profiles?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export async function fetchCalendarEvents(hakoId: string, startDate: string, endDate: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('hako_calendar_events')
    .select('*, profiles(display_name, avatar_url)')
    .eq('hako_id', hakoId)
    .gte('start_at', startDate)
    .lte('start_at', endDate)
    .order('start_at', { ascending: true })

  if (error) {
    console.error('Error fetching calendar events:', error)
    return []
  }

  return data as CalendarEvent[]
}

export async function createCalendarEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'user_id' | 'profiles'>) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('hako_calendar_events')
    .insert({
      ...event,
      user_id: user.id
    })
    .select()
    .single()

  if (error) throw error
  
  revalidatePath(`/hako/${event.hako_id}/calendar`)
  return data
}

export async function updateCalendarEvent(eventId: string, hakoId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'user_id' | 'hako_id' | 'profiles'>>) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('hako_calendar_events')
    .update(updates)
    .eq('id', eventId)
    .eq('user_id', user.id)

  if (error) throw error
  
  revalidatePath(`/hako/${hakoId}/calendar`)
  return { success: true }
}

export async function deleteCalendarEvent(eventId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('hako_calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', user.id)

  if (error) throw error
  
  revalidatePath(`/hako/${hakoId}/calendar`)
  return { success: true }
}

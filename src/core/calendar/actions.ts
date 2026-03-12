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
  is_private: boolean
  created_at: string
  profiles?: {
    display_name: string | null
    avatar_url: string | null
  }
}

export async function fetchCalendarEvents(hakoId: string, startDate: string, endDate: string) {
  const supabase = await createServerSupabaseClient()
  
  // Note: RLS handles the privacy filtering automatically
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

  // Fetch per-Hako display names & avatars from hako_members
  const memberDataMap: Record<string, { display_name?: string | null, avatar_url?: string | null }> = {}
  try {
    const { data: hakoMembers, error: memberError } = await supabase
      .from('hako_members')
      .select('user_id, display_name, avatar_url')
      .eq('hako_id', hakoId)

    if (!memberError && hakoMembers) {
      for (const m of hakoMembers) {
        memberDataMap[m.user_id] = { display_name: m.display_name, avatar_url: m.avatar_url }
      }
    }
  } catch (err) {
    console.warn('Failed to fetch hako_members for profiling:', err)
  }

  const resolveName = (userId: string, profileName?: string | null) =>
    memberDataMap[userId]?.display_name || profileName || 'ユーザー'
    
  const resolveAvatar = (userId: string, profileAvatar?: string | null) =>
    memberDataMap[userId]?.avatar_url || profileAvatar || null

  const events = (data || []).map(event => {
    const pProfiles = (event as any).profiles || {}
    return {
      ...event,
      profiles: {
        ...pProfiles,
        display_name: resolveName(event.user_id, pProfiles.display_name),
        avatar_url: resolveAvatar(event.user_id, pProfiles.avatar_url)
      }
    }
  })

  return events as CalendarEvent[]
}

export async function createCalendarEvent(event: Omit<CalendarEvent, 'id' | 'created_at' | 'user_id' | 'profiles'>) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('認証が必要です')

  // Explicit membership check for better debugging
  const { data: member, error: memberError } = await supabase
    .from('hako_members')
    .select('id')
    .eq('hako_id', event.hako_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (memberError) {
    console.error('Membership check error:', memberError)
    throw new Error('メンバー情報の確認に失敗しました')
  }
  
  if (!member) {
    throw new Error('この箱のメンバーではありません')
  }

  const { data, error } = await supabase
    .from('hako_calendar_events')
    .insert({
      ...event,
      user_id: user.id
    })
    .select()
    .single()

  if (error) {
    console.error('Create calendar event error:', error)
    throw new Error(`予定の作成に失敗しました: ${error.message}`)
  }
  
  revalidatePath(`/hako/${event.hako_id}/calendar`)
  return data
}

export async function updateCalendarEvent(eventId: string, hakoId: string, updates: Partial<Omit<CalendarEvent, 'id' | 'created_at' | 'user_id' | 'hako_id' | 'profiles'>>) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('認証が必要です')

  const { error } = await supabase
    .from('hako_calendar_events')
    .update(updates)
    .eq('id', eventId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Update calendar event error:', error)
    throw new Error(`予定の更新に失敗しました: ${error.message}`)
  }
  
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

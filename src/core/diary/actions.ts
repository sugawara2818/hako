'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDiaryEntry(hakoId: string, title: string, content: string, diaryDate: string, isPublic: boolean = true) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('hako_diaries')
    .insert({
      hako_id: hakoId,
      user_id: user.id,
      title: title.trim(),
      content: content.trim(),
      diary_date: diaryDate,
      is_public: isPublic
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
       throw new Error('この日付の日記は既に存在します。')
    }
    throw error
  }

  revalidatePath(`/hako/${hakoId}/diary`)
  return data
}

export async function updateDiaryEntry(diaryId: string, hakoId: string, updates: { title?: string, content?: string, is_public?: boolean }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('hako_diaries')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', diaryId)
    .eq('user_id', user.id) // Security check
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/hako/${hakoId}/diary`)
  revalidatePath(`/hako/${hakoId}/diary/${diaryId}`)
  return data
}

export async function deleteDiaryEntry(diaryId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('hako_diaries')
    .delete()
    .eq('id', diaryId)
    .eq('user_id', user.id) // Security check

  if (error) throw error

  revalidatePath(`/hako/${hakoId}/diary`)
  return { success: true }
}

export async function fetchDiaryEntries(hakoId: string, date?: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('hako_diaries')
    .select(`
      *,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('hako_id', hakoId)
    .order('diary_date', { ascending: false })

  // Filtering: Users can see their own private ones and public ones of others
  query = query.or(`user_id.eq.${user.id},is_public.eq.true`)

  if (date) {
    query = query.eq('diary_date', date)
  }

  const { data, error } = await query

  if (error) throw error
  return data
}

export async function fetchDiaryStats(hakoId: string, year: number, month: number) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const startDate = new Date(year, month, 1).toISOString().split('T')[0]
  const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('hako_diaries')
    .select('diary_date, is_public, user_id')
    .eq('hako_id', hakoId)
    .gte('diary_date', startDate)
    .lte('diary_date', endDate)
    .or(`user_id.eq.${user.id},is_public.eq.true`)

  if (error) throw error

  // Transform into a map of date -> count
  const stats: Record<string, number> = {}
  data.forEach(d => {
    stats[d.diary_date] = (stats[d.diary_date] || 0) + 1
  })

  return stats
}

export async function fetchUserDiaryDates(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('hako_diaries')
    .select('diary_date')
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)

  if (error) throw error
  return data.map(d => d.diary_date)
}

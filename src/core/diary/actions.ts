'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateDiaryTitle as aiGenerateTitle } from '@/core/ai/gemini'

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

export async function updateDiaryEntry(diaryId: string, hakoId: string, updates: { title?: string, content?: string, diary_date?: string, is_public?: boolean }) {
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

  if (error) {
    if (error.code === '23505') {
       throw new Error('変更先の日付には既に日記が存在します。')
    }
    throw error
  }

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

export async function fetchDiaryEntries(hakoId: string, options?: { userId?: string, date?: string }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  let query = supabase
    .from('hako_diaries')
    .select('*')
    .eq('hako_id', hakoId)
    .order('diary_date', { ascending: false })

  // Filtering: Users can see their own private ones and public ones of others
  query = query.or(`user_id.eq.${user.id},is_public.eq.true`)

  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }

  if (options?.date) {
    query = query.eq('diary_date', options.date)
  }

  const { data: diaryData, error: diaryError } = await query

  if (diaryError) {
    console.error('fetchDiaryEntries Error:', diaryError)
    throw diaryError
  }

  if (!diaryData || diaryData.length === 0) return []

  const userIds = [...new Set(diaryData.map(d => d.user_id))]

  // 1. Fetch profiles separately
  const profileMap: Record<string, any> = {}
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds)
    
    if (profiles) {
      profiles.forEach(p => { profileMap[p.id] = p })
    }
  } catch (e) {
    console.error('fetchProfiles Error:', e)
  }

  // 2. Fetch hako_members separately for per-Hako profiles
  const memberDataMap: Record<string, { display_name?: string | null, avatar_url?: string | null }> = {}
  try {
    const { data: hakoMembers } = await supabase
      .from('hako_members')
      .select('user_id, display_name, avatar_url')
      .eq('hako_id', hakoId)
      .in('user_id', userIds)

    if (hakoMembers) {
      for (const m of hakoMembers) {
        memberDataMap[m.user_id] = { display_name: m.display_name, avatar_url: m.avatar_url }
      }
    }
  } catch (e) {
    console.error('fetchHakoMemberNames Error:', e)
  }

  // 3. Join in memory
  return diaryData.map(entry => {
    const globalProfile = profileMap[entry.user_id] || {}
    const memberProfile = memberDataMap[entry.user_id] || {}
    
    return {
      ...entry,
      profiles: {
        ...globalProfile,
        avatar_url: memberProfile.avatar_url || globalProfile.avatar_url || null
      },
      hako_members: [{ display_name: memberProfile.display_name || null }]
    }
  })
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

export async function generateAITitle(content: string) {
  try {
    const title = await aiGenerateTitle(content)
    if (!title) throw new Error('タイトルを生成できませんでした。')
    return title.trim()
  } catch (error: any) {
    console.error('AI Title Generation Error:', error)
    // Avoid returning the full stack in production but keep the message
    throw new Error(error.message || 'タイトルの生成に失敗しました。')
  }
}

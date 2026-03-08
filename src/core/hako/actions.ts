'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
// オーナーが箱作成
export async function createHakoForOwner(userId: string, name: string, description: string = '') {
  const supabase = await createServerSupabaseClient()
  const { data: hako, error } = await supabase
    .from('hako')
    .insert({ name, description, owner_id: userId })
    .select()
    .single()

  if (error) throw error

  await supabase.from('hako_members').insert({
    hako_id: hako.id,
    user_id: userId,
    role: 'owner',
  })

  return hako
}

// メンバーが箱に参加
export async function joinHako(userId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: member, error } = await supabase
    .from('hako_members')
    .insert({ hako_id: hakoId, user_id: userId, role: 'member' })
    .select()
    .maybeSingle()

  if (error) throw error
  return member
}

// メンバー一覧取得
export async function fetchHakoMembers(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('hako_members')
    .select('role, user_id, users(email)')
    .eq('hako_id', hakoId)
    .order('joined_at', { ascending: true })

  if (error) throw error
  return data
}

// メンバー退会
export async function leaveHako(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('hako_members')
    .delete()
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)

  if (error) throw error
  return { success: true }
}

// ディスプレイネーム更新
export async function updateDisplayName(hakoId: string, displayName: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('hako_members')
    .update({ display_name: displayName.trim() || null })
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath(`/hako/${hakoId}`)
  return { success: true }
}

// 箱の情報更新 (オーナー向け)
export async function updateHako(hakoId: string, updates: { name?: string, icon_url?: string | null, icon_color?: string | null }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // Check ownership
  const { data: hako } = await supabase
    .from('hako')
    .select('owner_id')
    .eq('id', hakoId)
    .single()

  if (!hako || hako.owner_id !== user.id) {
    throw new Error('Not authorized')
  }

  const { error } = await supabase
    .from('hako')
    .update(updates)
    .eq('id', hakoId)

  if (error) throw error
  
  revalidatePath(`/hako/${hakoId}`)
  revalidatePath(`/owner/hako/${hakoId}`)
  revalidatePath('/owner/dashboard')
  
  return { success: true }
}
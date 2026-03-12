'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateHakoDescription as aiGenerateDescription } from '@/core/ai/gemini'

// 箱内の最新更新日時を取得
export async function getLatestTimestamps(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  const [postRes, diaryRes] = await Promise.all([
    supabase.from('hako_timeline_posts').select('created_at').eq('hako_id', hakoId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('hako_diaries').select('created_at').eq('hako_id', hakoId).eq('is_public', true).order('created_at', { ascending: false }).limit(1).maybeSingle()
  ])
  
  return {
    latestPost: postRes.data?.created_at || null,
    latestDiary: diaryRes.data?.created_at || null
  }
}
// オーナーが箱作成
export async function createHakoForOwner(userId: string, name: string, description: string = '', features: string[] = ['timeline']) {
  const supabase = await createServerSupabaseClient()
  const { data: hako, error } = await supabase
    .from('hako')
    .insert({ name, description, owner_id: userId, features })
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

// メンバーアバター更新 (URL直接指定)
export async function updateUserAvatar(hakoId: string, avatarUrl: string | null) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { error } = await supabase
    .from('hako_members')
    .update({ avatar_url: avatarUrl })
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)

  if (error) throw error
  revalidatePath(`/hako/${hakoId}`)
  return { success: true }
}

// メンバーアバター画像アップロードとDB更新 (FormData経由)
export async function uploadAndUpdateUserAvatar(hakoId: string, formData: FormData) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('File is missing')
  if (file.size > 5 * 1024 * 1024) throw new Error('File is too large')

  const ext = (file.name.split('.').pop() || 'webp').toLowerCase()
  const fileName = `${user.id}/avatar_${Date.now()}.${ext}`

  // Ensure we use the existing functional bucket 'post-images' to bypass bucket creation issues
  const { error: uploadError } = await supabase.storage
    .from('post-images')
    .upload(fileName, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    console.error('Avatar upload error:', uploadError)
    throw new Error('Failed to upload avatar image')
  }

  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(fileName)

  // Update DB
  const { error: dbError } = await supabase
    .from('hako_members')
    .update({ avatar_url: publicUrl })
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)

  if (dbError) throw dbError

  revalidatePath(`/hako/${hakoId}`)
  return { success: true, url: publicUrl }
}

// 箱の情報更新 (オーナー向け)
export async function updateHako(hakoId: string, updates: { name?: string, icon_url?: string | null, icon_color?: string | null, features?: string[] }) {
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

// 箱を削除 (オーナー向け)
export async function deleteHako(hakoId: string) {
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

  // Delete everything related to this hako
  // Note: If cascading is not set up in DB, we do it manually
  await supabase.from('hako_timeline_likes').delete().eq('hako_id', hakoId)
  await supabase.from('hako_timeline_comments').delete().eq('hako_id', hakoId)
  await supabase.from('hako_timeline_posts').delete().eq('hako_id', hakoId)
  await supabase.from('hako_members').delete().eq('hako_id', hakoId)
  
  const { error } = await supabase
    .from('hako')
    .delete()
    .eq('id', hakoId)

  if (error) throw error
  
  revalidatePath('/owner/dashboard')
  revalidatePath('/')
  
  return { success: true }
}

export async function generateAIHakoDescription(name: string) {
  try {
    console.log('Generating AI description for Hako:', name)
    const description = await aiGenerateDescription(name)
    if (!description) {
       console.error('AI generated empty description')
       return { success: false, error: '紹介文を生成できませんでした。' }
    }
    return { success: true, description: description.trim() }
  } catch (error: any) {
    console.error('AI Hako Description Generation Error:', error)
    return { success: false, error: error.message || '紹介文の生成に失敗しました。' }
  }
}
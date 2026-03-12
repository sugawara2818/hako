'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { generateHakoDescription as aiGenerateDescription } from '@/core/ai/gemini'
// 繧ｪ繝ｼ繝翫・縺檎ｮｱ菴懈・
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

// 繝｡繝ｳ繝舌・縺檎ｮｱ縺ｫ蜿ょ刈
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

// 繝｡繝ｳ繝舌・荳隕ｧ蜿門ｾ・
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

// 繝｡繝ｳ繝舌・騾莨・
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

// 繝・ぅ繧ｹ繝励Ξ繧､繝阪・繝譖ｴ譁ｰ
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

// 繝｡繝ｳ繝舌・繧｢繝舌ち繝ｼ譖ｴ譁ｰ (URL逶ｴ謗･謖・ｮ・
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

// 繝｡繝ｳ繝舌・繧｢繝舌ち繝ｼ逕ｻ蜒上い繝・・繝ｭ繝ｼ繝峨→DB譖ｴ譁ｰ (FormData邨檎罰)
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

// 邂ｱ縺ｮ諠・ｱ譖ｴ譁ｰ (繧ｪ繝ｼ繝翫・蜷代￠)
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

// 邂ｱ繧貞炎髯､ (繧ｪ繝ｼ繝翫・蜷代￠)
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
    const description = await aiGenerateDescription(name)
    return description.trim()
  } catch (error) {
    console.error('AI Hako Description Generation Error:', error)
    throw new Error('紹介文の生成に失敗しました。')
  }
}
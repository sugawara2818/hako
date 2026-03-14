'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getGalleryImages(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('hako_gallery_posts')
    .select(`
      id,
      image_url,
      caption,
      created_at,
      user_id,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('hako_id', hakoId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getGalleryImages Error:', error)
    return []
  }

  return (data || []).map(post => {
    const memberInfo = (post.profiles as any) || {}
    return {
      id: post.id,
      url: post.image_url,
      caption: post.caption,
      createdAt: post.created_at,
      userName: memberInfo.display_name || 'ユーザー',
      userAvatar: memberInfo.avatar_url
    }
  })
}

export async function createGalleryPost(hakoId: string, imageUrl: string, caption?: string) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('hako_gallery_posts')
      .insert({
        hako_id: hakoId,
        user_id: user.id,
        image_url: imageUrl,
        caption: caption || null
      })

    if (error) throw error

    revalidatePath(`/hako/${hakoId}/gallery`)
    return { success: true }
  } catch (err: any) {
    console.error('Gallery Post Creation Error:', err)
    return { success: false, error: '投稿に失敗しました。' }
  }
}

export async function deleteGalleryPost(postId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('hako_gallery_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath(`/hako/${hakoId}/gallery`)
  return true
}

'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createTimelinePost, deleteTimelinePost } from '@/core/timeline/actions'

export async function getGalleryImages(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('hako_timeline_posts')
    .select(`
      id,
      image_urls,
      content,
      created_at,
      user_id,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('hako_id', hakoId)
    .eq('is_gallery', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getGalleryImages Error:', error)
    return []
  }

  return (data || []).map(post => {
    const memberInfo = (post.profiles as any) || {}
    return {
      id: post.id,
      url: post.image_urls?.[0] || '', // Gallery posts usually have one main image
      caption: post.content,
      createdAt: post.created_at,
      userName: memberInfo.display_name || 'ユーザー',
      userAvatar: memberInfo.avatar_url
    }
  })
}

export async function createGalleryPost(hakoId: string, imageUrl: string, caption?: string) {
  // We now use the unified timeline post creation
  const result = await createTimelinePost(hakoId, caption || '', [imageUrl], { is_gallery: true })
  
  if (result.success) {
    revalidatePath(`/hako/${hakoId}/gallery`)
  }
  
  return result
}

export async function deleteGalleryPost(postId: string, hakoId: string) {
  // We use the unified timeline post deletion
  const result = await deleteTimelinePost(postId, hakoId)
  
  if (result) {
    revalidatePath(`/hako/${hakoId}/gallery`)
  }
  
  return result
}

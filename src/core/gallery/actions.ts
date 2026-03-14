'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createTimelinePost, deleteTimelinePost } from '@/core/timeline/actions'

export async function getGalleryImages(hakoId: string, filter: 'featured' | 'discovery' = 'featured') {
  const supabase = await createServerSupabaseClient()
  
  let query = supabase
    .from('hako_timeline_posts')
    .select(`
      id,
      image_urls,
      image_url,
      content,
      created_at,
      user_id,
      is_gallery,
      album_id,
      profiles:user_id (display_name, avatar_url),
      hako_members(display_name, hako_id)
    `)
    .eq('hako_id', hakoId)
    .order('created_at', { ascending: false })

  if (filter === 'featured') {
    query = query.eq('is_gallery', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('getGalleryImages Error:', error)
    return []
  }

  // Filter out posts that effectively have no images (empty array)
  return (data || [])
    .filter(post => (post.image_urls && post.image_urls.length > 0) || post.image_url)
    .map(post => {
      const globalProfile = (post.profiles as any) || {}
      const memberInfo = ((post.hako_members as any[]) || []).find(m => m.hako_id === hakoId) || {}
      
      return {
        id: post.id,
        url: post.image_urls?.[0] || post.image_url || '',
        caption: post.content,
        createdAt: post.created_at,
        userName: memberInfo.display_name || globalProfile.display_name || 'ユーザー',
        userAvatar: globalProfile.avatar_url,
        isPinned: post.is_gallery,
        albumId: post.album_id
      }
    })
}

export async function toggleGalleryPin(postId: string, hakoId: string, isPinned: boolean) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('hako_timeline_posts')
    .update({ is_gallery: isPinned })
    .eq('id', postId)
    .eq('hako_id', hakoId)

  if (error) {
    console.error('toggleGalleryPin Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/hako/${hakoId}/gallery`)
  revalidatePath(`/hako/${hakoId}`)
  return { success: true }
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

export async function getAlbums(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('hako_gallery_albums')
    .select('*')
    .eq('hako_id', hakoId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getAlbums Error:', error)
    return []
  }
  return data || []
}

export async function createAlbum(hakoId: string, name: string, description?: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('hako_gallery_albums')
    .insert({
      hako_id: hakoId,
      user_id: user.id,
      name,
      description
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/hako/${hakoId}/gallery`)
  return { success: true, data }
}

export async function addPostToAlbum(postId: string, albumId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('hako_timeline_posts')
    .update({ album_id: albumId })
    .eq('id', postId)
    .eq('hako_id', hakoId)

  if (error) return { success: false, error: error.message }
  
  revalidatePath(`/hako/${hakoId}/gallery`)
  return { success: true }
}

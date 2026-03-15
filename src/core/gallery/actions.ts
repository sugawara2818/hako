'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { createTimelinePost, deleteTimelinePost } from '@/core/timeline/actions'

export async function getGalleryImages(hakoId: string, filter: 'featured' | 'discovery' = 'featured') {
  const supabase = await createServerSupabaseClient()
  
  // Try the most detailed query first
  const { data, error } = await supabase
    .from('hako_timeline_posts')
    .select(`
      id,
      image_urls,
      image_url,
      content,
      created_at,
      user_id,
      is_gallery,
      is_timeline,
      album_id,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('hako_id', hakoId)
    .eq('is_gallery', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Detailed getGalleryImages failed, falling back to basic query:', error.message)
    
    // Fallback: If columns like is_timeline or album_id are missing, try a basic query
    const { data: fallbackData, error: fallbackError } = await supabase
      .from('hako_timeline_posts')
      .select(`
        id,
        image_urls,
        image_url,
        content,
        created_at,
        user_id,
        profiles:user_id (display_name, avatar_url)
      `)
      .eq('hako_id', hakoId)
      .eq('is_gallery', true)
      .order('created_at', { ascending: false })

    if (fallbackError) {
      console.error('getGalleryImages Fallback Error:', fallbackError)
      return []
    }
    
    // Separately fetch per-Hako display names & avatars from hako_members for fallback
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
    } catch (e) {
      console.warn('Failed to fetch hako_members in gallery fallback:', e)
    }

    return (fallbackData || [])
      .filter(post => (post.image_urls && post.image_urls.length > 0) || post.image_url)
      .map(post => {
        const globalProfile = (post.profiles as any) || {}
        const memberInfo = memberDataMap[post.user_id] || {}
        return {
          id: post.id,
          url: (post.image_urls as string[])?.[0] || (post.image_url as string) || '',
          caption: post.content,
          createdAt: post.created_at,
          userName: memberInfo.display_name || globalProfile.display_name || 'ユーザー',
          userAvatar: memberInfo.avatar_url || globalProfile.avatar_url,
          userId: post.user_id,
          isPinned: false,
          albumId: null
        }
      })
  }

  // Separately fetch per-Hako display names & avatars from hako_members
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
  } catch (e) {
    console.warn('Failed to fetch hako_members in gallery:', e)
  }

  // Filter out posts based on the filter and presence of images
  return (data || [])
    .filter(post => {
      // Basic image check
      const hasImage = (post.image_urls && post.image_urls.length > 0) || post.image_url
      if (!hasImage) return false
      
      // Filter logic
      if (filter === 'featured' && !post.is_gallery) return false
      
      return true
    })
    .map(post => {
      const globalProfile = (post.profiles as any) || {}
      const memberInfo = memberDataMap[post.user_id] || {}
      
      return {
        id: post.id,
        url: post.image_urls?.[0] || post.image_url || '',
        caption: post.content,
        createdAt: post.created_at,
        userName: memberInfo.display_name || globalProfile.display_name || 'ユーザー',
        userAvatar: memberInfo.avatar_url || globalProfile.avatar_url,
        userId: post.user_id,
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

export async function createGalleryPost(hakoId: string, imageUrl: string, caption?: string, options?: { is_timeline?: boolean }) {
  // We now use the unified timeline post creation
  // Default is_timeline to false for gallery-specific posts
  const result = await createTimelinePost(hakoId, caption || '', [imageUrl], { 
    is_gallery: true,
    is_timeline: options?.is_timeline || false
  })
  
  if (result.success) {
    revalidatePath(`/hako/${hakoId}/gallery`)
    revalidatePath(`/hako/${hakoId}`)
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

  // Separately fetch per-Hako display names & avatars from hako_members
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
  } catch (e) {
    console.warn('Failed to fetch hako_members in getAlbums:', e)
  }

  const albumsWithMetadata = await Promise.all((data || []).map(async (album) => {
    const globalProfile = (album.profiles as any) || {}
    const memberInfo = memberDataMap[album.user_id] || {}
    
    // Fetch top 4 photos for this album
    const { data: previewPhotos } = await supabase
      .from('hako_timeline_posts')
      .select('image_urls, image_url')
      .eq('album_id', album.id)
      .order('created_at', { ascending: false })
      .limit(4)

    // Fetch total count of photos
    const { count } = await supabase
      .from('hako_timeline_posts')
      .select('*', { count: 'exact', head: true })
      .eq('album_id', album.id)
    
    return {
      ...album,
      userName: memberInfo.display_name || globalProfile.display_name || 'ユーザー',
      userAvatar: memberInfo.avatar_url || globalProfile.avatar_url,
      previewPhotos: (previewPhotos || []).map(p => (p.image_urls as string[])?.[0] || (p.image_url as string) || ''),
      totalCount: count || 0
    }
  }))

  return albumsWithMetadata
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

export async function batchAddPostsToAlbum(postIds: string[], albumId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('hako_timeline_posts')
    .update({ album_id: albumId })
    .in('id', postIds)
    .eq('hako_id', hakoId)

  if (error) {
    console.error('batchAddPostsToAlbum Error:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/hako/${hakoId}/gallery`)
  return { success: true }
}
export async function syncAlbumPhotos(selectedPostIds: string[], albumId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  // 1. Remove album_id from all posts currently in this album
  const { error: clearError } = await supabase
    .from('hako_timeline_posts')
    .update({ album_id: null })
    .eq('album_id', albumId)
    .eq('hako_id', hakoId)

  if (clearError) {
    console.error('syncAlbumPhotos Clear Error:', clearError)
    return { success: false, error: clearError.message }
  }

  // 2. Add album_id to all selected posts
  if (selectedPostIds.length > 0) {
    const { error: updateError } = await supabase
      .from('hako_timeline_posts')
      .update({ album_id: albumId })
      .in('id', selectedPostIds)
      .eq('hako_id', hakoId)

    if (updateError) {
      console.error('syncAlbumPhotos Update Error:', updateError)
      return { success: false, error: updateError.message }
    }
  }

  revalidatePath(`/hako/${hakoId}/gallery`)
  return { success: true }
}

export async function deleteAlbum(albumId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { error } = await supabase
    .from('hako_gallery_albums')
    .delete()
    .eq('id', albumId)

  if (error) {
    console.error('deleteAlbum Error:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath(`/hako/${hakoId}/gallery`)
  return { success: true }
}

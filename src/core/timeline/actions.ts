'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Fetch a single profile
export async function getProfile(userId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') return null // Not found
    console.error('getProfile Error:', error)
    return null
  }
  return data
}

// Fetch posts for a specific hako
export async function getTimelinePosts(hakoId: string, options?: { userId?: string }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // We need to fetch basic profile info and likes for each post
  // Fetch posts with profiles and likes/comments
  let query = supabase
    .from('hako_timeline_posts')
    .select(`
      *,
      profiles:user_id (id, display_name, avatar_url),
      likes:hako_timeline_likes (user_id),
      comments:hako_timeline_comments (
        id, content, created_at, user_id,
        profiles:user_id (id, display_name, avatar_url)
      )
    `)
    .eq('hako_id', hakoId)
    .or('is_timeline.eq.true,is_timeline.is.null') // Show posts intended for timeline, or legacy posts

  if (options?.userId) {
    query = query.eq('user_id', options.userId)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) throw error

  // Separately fetch per-Hako display names & avatars from hako_members
  // Wrapped in try/catch in case the columns haven't been added yet
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
  } catch {
    // Silently fall back to profile names if hako_members columns don't exist
  }

  const resolveName = (userId: string, profileName?: string | null) =>
    memberDataMap[userId]?.display_name || profileName || 'ユーザー'
    
  const resolveAvatar = (userId: string, profileAvatar?: string | null) =>
    memberDataMap[userId]?.avatar_url || profileAvatar || null

  // Defensive mapping
  const posts = (data || []).map(post => {
    const pProfiles = post.profiles || {}
    const pLikes = post.likes || []
    const pComments = post.comments || []
    
    // Aggregate image_url and image_urls for compatibility
    const allImages = [...(post.image_urls || [])]
    if (post.image_url && !allImages.includes(post.image_url)) {
      allImages.unshift(post.image_url)
    }

    return {
      ...post,
      image_urls: allImages,
      profiles: {
        ...pProfiles,
        display_name: resolveName(post.user_id, pProfiles.display_name),
        avatar_url: resolveAvatar(post.user_id, pProfiles.avatar_url)
      },
      likes_count: pLikes.length,
      is_liked: pLikes.some((like: any) => like.user_id === user.id),
      comments: [...pComments]
        .sort((a: any, b: any) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0
          return timeA - timeB
        })
        .map((c: any) => {
          const cProfiles = c.profiles || {}
          return {
            ...c,
            profiles: {
              ...cProfiles,
              display_name: resolveName(c.user_id, cProfiles.display_name),
              avatar_url: resolveAvatar(c.user_id, cProfiles.avatar_url)
            }
          }
        })
    }
  })

  return posts
}

// Create a new timeline post
export async function createTimelinePost(
  hakoId: string, 
  content: string, 
  imageUrls?: string[], 
  options?: { is_gallery?: boolean; is_timeline?: boolean; albumId?: string | null }
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Unauthorized' }

    const { error } = await supabase
      .from('hako_timeline_posts')
      .insert({
        hako_id: hakoId,
        user_id: user.id,
        content,
        image_url: imageUrls?.[0] || null, // Fallback for legacy
        image_urls: imageUrls || [],
        is_gallery: options?.is_gallery ?? true,
        is_timeline: options?.is_timeline !== undefined ? options.is_timeline : true,
        album_id: options?.albumId || null
      })

    if (error) {
      console.error('Post Creation Error:', error)
      return { success: false, error: `投稿の保存に失敗しました: ${error.message} (${error.code})` }
    }

    // Revalidate the hako page to show new post
    revalidatePath(`/hako/${hakoId}`)
    return { success: true }
  } catch (e: any) {
    console.error('Unexpected Post Creation Error:', e)
    return { success: false, error: '予期せぬエラーが発生しました' }
  }
}

// Toggle like on a post
export async function toggleLike(postId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Check if already liked
  const { data: existingLike } = await supabase
    .from('hako_timeline_likes')
    .select('user_id')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existingLike) {
    // Unlike
    const { error } = await supabase
      .from('hako_timeline_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id)
      
    if (error) {
        console.error("Unlike Error:", error);
        throw new Error("Failed to unlike");
    }
  } else {
    // Like
    const { error } = await supabase
      .from('hako_timeline_likes')
      .insert({
        post_id: postId,
        user_id: user.id
      })
      
    if (error) {
        console.error("Like Error:", error);
        throw new Error("Failed to like");
    }
  }

  return !existingLike
}

// Add a comment to a post
export async function addTimelineComment(postId: string, hakoId: string, content: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('hako_timeline_comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      content
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath(`/hako/${hakoId}`)
  return data
}

// Delete a timeline post
export async function deleteTimelinePost(postId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('hako_timeline_posts')
    .delete()
    // Enforce that only the author can delete
    .eq('id', postId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath(`/hako/${hakoId}`)
  return true
}

// Delete a comment
export async function deleteTimelineComment(commentId: string, postId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('hako_timeline_comments')
    .delete()
    // Enforce that only the author can delete
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath(`/hako/${hakoId}`)
  return true
}

// Ensure user profile exists
export async function ensureProfile(userId: string, email?: string) {
  const supabase = await createServerSupabaseClient()
  
  // Try to get existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .single()
    
  if (!existing) {
    // Generate a simple default display name from email, stripping the isolation suffix
    // e.g., test+hako_123@gmail.com -> test
    let defaultName = 'ユーザー'
    if (email) {
        const localPart = email.split('@')[0]
        defaultName = localPart.split('+')[0]
    }
    
    await supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: defaultName
      })
  }
}

// Update a comment
export async function updateTimelineComment(commentId: string, hakoId: string, content: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('hako_timeline_comments')
    .update({ content })
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (error) throw error

  revalidatePath(`/hako/${hakoId}`)
  return true
}

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
export async function getTimelinePosts(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // We need to fetch basic profile info and likes for each post
  // Fetch posts with profiles and likes/comments
  const { data, error } = await supabase
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
    .order('created_at', { ascending: false })

  if (error) throw error

  // Separately fetch per-Hako display names from hako_members
  // Wrapped in try/catch in case the display_name column hasn't been added yet
  const displayNameMap: Record<string, string> = {}
  try {
    const { data: hakoMemberNames, error: memberNameError } = await supabase
      .from('hako_members')
      .select('user_id, display_name')
      .eq('hako_id', hakoId)

    if (!memberNameError && hakoMemberNames) {
      for (const m of hakoMemberNames) {
        if (m.display_name) displayNameMap[m.user_id] = m.display_name
      }
    }
  } catch {
    // Silently fall back to profile names if hako_members.display_name doesn't exist
  }

  const resolveName = (userId: string, profileName?: string | null) =>
    displayNameMap[userId] || profileName || 'ユーザー'

  // Defensive mapping
  const posts = (data || []).map(post => {
    const pProfiles = post.profiles || {}
    const pLikes = post.likes || []
    const pComments = post.comments || []
    
    return {
      ...post,
      profiles: {
        ...pProfiles,
        display_name: resolveName(post.user_id, pProfiles.display_name)
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
              display_name: resolveName(c.user_id, cProfiles.display_name)
            }
          }
        })
    }
  })

  return posts
}

// Create a new timeline post
export async function createTimelinePost(hakoId: string, content: string, imageUrl?: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('hako_timeline_posts')
    .insert({
      hako_id: hakoId,
      user_id: user.id,
      content,
      image_url: imageUrl || null
    })
    .select()
    .single()

  if (error) throw error

  // Revalidate the hako page to show new post
  revalidatePath(`/hako/${hakoId}`)
  return data
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

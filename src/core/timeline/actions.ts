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
  const { data: hakoMemberNames } = await supabase
    .from('hako_members')
    .select('user_id, display_name')
    .eq('hako_id', hakoId)
    .not('display_name', 'is', null)

  // Build a lookup map: userId -> hako-specific display_name
  const displayNameMap: Record<string, string> = {}
  for (const m of hakoMemberNames || []) {
    if (m.display_name) displayNameMap[m.user_id] = m.display_name
  }

  const resolveName = (userId: string, profileName?: string | null) =>
    displayNameMap[userId] || profileName || 'ユーザー'

  const posts = data.map(post => ({
    ...post,
    profiles: {
      ...post.profiles,
      display_name: resolveName(post.user_id, post.profiles?.display_name)
    },
    likes_count: post.likes.length,
    is_liked: post.likes.some((like: any) => like.user_id === user.id),
    comments: post.comments
      .sort((a: any, b: any) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      .map((c: any) => ({
        ...c,
        profiles: {
          ...c.profiles,
          display_name: resolveName(c.user_id, c.profiles?.display_name)
        }
      }))
  }))

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
    .single()

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

  revalidatePath(`/hako/${hakoId}`)
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

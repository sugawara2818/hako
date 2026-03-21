'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendChatMessage(hakoId: string, channelId: string, content: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      hako_id: hakoId,
      channel_id: channelId,
      user_id: user.id,
      content,
    })
    .select()
    .single()

  if (error) {
    console.error('sendChatMessage Error:', error)
    return { success: false, error: error.message }
  }

  return { success: true, data }
}

export async function getChatMessages(hakoId: string, channelId: string, limit = 50) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      metadata,
      channel_id
    `)
    .eq('hako_id', hakoId)
    .eq('channel_id', channelId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('getChatMessages Error:', error)
    return []
  }

  // Fetch member info for display names and avatars
  const { data: members, error: memberError } = await supabase
    .from('hako_members')
    .select('user_id, display_name, avatar_url')
    .eq('hako_id', hakoId)

  const memberMap: Record<string, { display_name: string; avatar_url: string | null }> = {}
  if (!memberError && members) {
    members.forEach(m => {
      memberMap[m.user_id] = {
        display_name: m.display_name,
        avatar_url: m.avatar_url
      }
    })
  }

  return (data || [])
    .reverse() // Display in chronological order
    .map(msg => ({
      ...msg,
      userName: memberMap[msg.user_id]?.display_name || 'ユーザー',
      userAvatar: memberMap[msg.user_id]?.avatar_url || null
    }))
}

export async function deleteChatMessage(messageId: string, hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .eq('id', messageId)
    .eq('user_id', user.id) // Only allow deleting own messages

  if (error) {
     console.error('deleteChatMessage Error:', error)
     return { success: false, error: error.message }
  }

  return { success: true }
}

export async function getChatChannels(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return []

  // This query relies on RLS policies to show:
  // 1. All public channels in the Hako
  // 2. Private channels the user is a member of
  const { data, error } = await supabase
    .from('chat_channels')
    .select('*')
    .eq('hako_id', hakoId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('getChatChannels Error:', error)
    return []
  }

  return data || []
}

export async function createChatChannel(
  hakoId: string, 
  name: string, 
  description: string = '', 
  type: 'public' | 'private' = 'public',
  memberIds: string[] = []
) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  const { data: channel, error } = await supabase
    .from('chat_channels')
    .insert({
      hako_id: hakoId,
      name,
      description,
      type,
      created_by: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('createChatChannel Error:', error)
    return { success: false, error: error.message }
  }

  // If private, or if we just want to track creator as member
  const membersToInsert = [...new Set([user.id, ...memberIds])].map(userId => ({
    channel_id: channel.id,
    user_id: userId
  }))

  if (membersToInsert.length > 0) {
    const { error: memberError } = await supabase
      .from('chat_channel_members')
      .insert(membersToInsert)

    if (memberError) {
      console.error('Add participants error:', memberError)
      // We don't fail the whole thing, but it's not ideal
    }
  }

  revalidatePath(`/hako/${hakoId}/chat`)
  return { success: true, data: channel }
}

export async function deleteChatChannel(hakoId: string, channelId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // Check if owner
  const { data: member } = await supabase
    .from('hako_members')
    .select('role')
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)
    .single()

  if (member?.role !== 'owner') {
    return { success: false, error: 'オーナーのみ削除可能です' }
  }

  // Prevent deleting the last channel (optional but recommended)
  const { count } = await supabase
    .from('chat_channels')
    .select('*', { count: 'exact', head: true })
    .eq('hako_id', hakoId)

  if (count && count <= 1) {
    return { success: false, error: '最後のチャンネルは削除できません' }
  }

  const { error } = await supabase
    .from('chat_channels')
    .delete()
    .eq('id', channelId)
    .eq('hako_id', hakoId)

  if (error) {
    console.error('deleteChatChannel Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/hako/${hakoId}/chat`)
  return { success: true }
}

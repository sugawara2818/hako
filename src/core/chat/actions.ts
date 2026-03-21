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

  // Update channel info
  await supabase
    .from('chat_channels')
    .update({
      last_message_content: content,
      last_message_at: new Date().toISOString()
    })
    .eq('id', channelId)

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
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    // Use regular client so remote RLS filters channels securely
    // Avoid adminSupabase as Vercel might lack SUPABASE_SERVICE_ROLE_KEY
    const { data: channels, error } = await supabase
      .from('chat_channels')
      .select('*')
      .eq('hako_id', hakoId)
      // .order('last_message_at', { ascending: false, nullsFirst: true }) // Disabled until DB migration is run
      .order('created_at', { ascending: false })

    if (error) {
      console.error('getChatChannels Error:', error)
      return []
    }

    const channelIds = channels.map(c => c.id)
    let readStateMap = new Map()
    
    if (channelIds.length > 0) {
      const { data: readStates } = await supabase
        .from('chat_channel_members')
        .select('channel_id, last_read_at')
        .in('channel_id', channelIds)
        .eq('user_id', user.id)
      
      readStateMap = new Map(readStates?.map(r => [r.channel_id, r.last_read_at]))
    }

    // Sort pinned channels and recent messages securely in JS to avoid crashing if DB migration isn't run yet
    const sortedChannels = (channels || []).sort((a, b) => {
      const aPinned = a.is_pinned ? 1 : 0
      const bPinned = b.is_pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime()
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime()
      return bTime - aTime
    })

    // Return channels with unreadCount
    return sortedChannels.map(ch => {
      const lastRead = readStateMap.get(ch.id)
      const isUnread = ch.last_message_at && (!lastRead || new Date(ch.last_message_at) > new Date(lastRead))
      return {
        ...ch,
        unreadCount: isUnread ? 1 : 0
      }
    })
  } catch (e) {
    console.error('Unexpected getChatChannels Error:', e)
    return []
  }
}

export async function markChannelAsRead(hakoId: string, channelId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false }

  const { error } = await supabase
    .from('chat_channel_members')
    .upsert({ 
      channel_id: channelId, 
      user_id: user.id,
      last_read_at: new Date().toISOString() 
    }, {
      onConflict: 'channel_id,user_id'
    })

  if (error) {
    console.error('markChannelAsRead Error:', error)
    return { success: false }
  }

  revalidatePath(`/hako/${hakoId}/chat`)
  return { success: true }
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

  if (error || !channel) {
    console.error('createChatChannel Error:', error)
    return { success: false, error: error?.message || 'チャンネルの作成に失敗しました' }
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
  
  // Return the channel with unreadCount 0 and other display fields
  return { 
    success: true, 
    data: {
      ...channel,
      unreadCount: 0,
      last_message_content: null,
      last_message_at: null
    } 
  }
}

export async function deleteChatChannel(hakoId: string, channelId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  // Check if user is the creator
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('created_by')
    .eq('id', channelId)
    .single()

  if (channel?.created_by !== user.id) {
    return { success: false, error: '作成者のみがチャンネルを削除できます' }
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

export async function togglePinChannel(hakoId: string, channelId: string, isPinned: boolean) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  const { error } = await supabase
    .from('chat_channels')
    .update({ 
      is_pinned: isPinned,
      pinned_at: isPinned ? new Date().toISOString() : null
    })
    .eq('id', channelId)
    .eq('hako_id', hakoId)

  if (error) {
    console.error('togglePinChannel Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/hako/${hakoId}/chat`)
  return { success: true }
}

export async function getChannelMembers(hakoId: string, channelId: string) {
  const supabase = await createServerSupabaseClient()
  
  // First get member IDs
  const { data: memberIds, error: mError } = await supabase
    .from('chat_channel_members')
    .select('user_id')
    .eq('channel_id', channelId)

  if (mError) {
    console.error('getChannelMembers Error (Ids):', mError)
    return []
  }

  const ids = memberIds.map(m => m.user_id)
  if (ids.length === 0) return []

  // Then get display info
  const { data: profiles, error: pError } = await supabase
    .from('hako_members')
    .select('user_id, display_name, avatar_url, role')
    .eq('hako_id', hakoId)
    .in('user_id', ids)

  if (pError) {
    console.error('getChannelMembers Error (Profiles):', pError)
    return []
  }

  return profiles || []
}

export async function updateChannelName(hakoId: string, channelId: string, name: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '認証が必要です' }

  // Check if owner
  const { data: channel } = await supabase
    .from('chat_channels')
    .select('created_by')
    .eq('id', channelId)
    .single()

  if (channel?.created_by !== user.id) {
    return { success: false, error: '作成者のみが変更可能です' }
  }

  const { error } = await supabase
    .from('chat_channels')
    .update({ name })
    .eq('id', channelId)

  if (error) {
    console.error('updateChannelName Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/hako/${hakoId}/chat`)
  return { success: true }
}

export async function addChannelMembers(hakoId: string, channelId: string, userIds: string[]) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false, error: '認証が必要です' }

  if (userIds.length === 0) return { success: true }

  const membersToInsert = userIds.map(uid => ({
    channel_id: channelId,
    user_id: uid
  }))

  const { error } = await supabase
    .from('chat_channel_members')
    .upsert(membersToInsert, { onConflict: 'channel_id,user_id' })

  if (error) {
    console.error('addChannelMembers Error:', error)
    return { success: false, error: error.message }
  }

  revalidatePath(`/hako/${hakoId}/chat`)
  return { success: true }
}


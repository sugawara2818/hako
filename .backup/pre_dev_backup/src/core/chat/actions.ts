'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendChatMessage(hakoId: string, channelId: string, content: string, metadata: any = {}) {
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
      metadata,
    })
    .select()
    .single()

  if (error) {
    console.error('sendChatMessage Error:', error)
    return { success: false, error: error.message }
  }

  // Update channel info and member read status
  const now = new Date().toISOString()
  
  let adminWorked = false
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY)
    
    const [chRes, memRes] = await Promise.all([
      adminSupabase
        .from('chat_channels')
        .update({ last_message_content: content, last_message_at: now })
        .eq('id', channelId),
      adminSupabase
        .from('chat_channel_members')
        .upsert({ channel_id: channelId, user_id: user.id, last_read_at: now }, { onConflict: 'channel_id,user_id' })
    ])
    
    if (!chRes.error && !memRes.error) adminWorked = true
  }

  if (!adminWorked) {
    await Promise.all([
      supabase
        .from('chat_channels')
        .update({
          last_message_content: content,
          last_message_at: now
        })
        .eq('id', channelId),
      supabase
        .from('chat_channel_members')
        .upsert({
          channel_id: channelId,
          user_id: user.id,
          last_read_at: now
        }, { onConflict: 'channel_id,user_id' })
    ])
  }

  return { success: true, data }
}

export async function getChatMessages(hakoId: string, channelId: string, limit = 50) {
  const supabase = await createServerSupabaseClient()
  
  // Fetch messages, members, and read statuses concurrently
  const [msgRes, memberStatusRes, allHakoMembersRes] = await Promise.all([
    supabase
      .from('chat_messages')
      .select(`id, content, created_at, user_id, channel_id, metadata`)
      .eq('hako_id', hakoId)
      .eq('channel_id', channelId)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('chat_channel_members')
      .select('user_id, last_read_at')
      .eq('channel_id', channelId),
    supabase
      .from('hako_members')
      .select('user_id, display_name, avatar_url, role')
      .eq('hako_id', hakoId)
  ])

  if (msgRes.error) {
    console.error('getChatMessages Error:', msgRes.error)
    return { messages: [], members: [] }
  }

  // Map member names/avatars
  const hakoMemberMap = new Map(allHakoMembersRes.data?.map(m => [m.user_id, m]) || [])
  
  // Map read statuses
  const readStatusMap = new Map(memberStatusRes.data?.map(m => [m.user_id, m.last_read_at]) || [])

  // Process messages
  const processedMessages = (msgRes.data || [])
    .reverse()
    .map(msg => {
      const profile = hakoMemberMap.get(msg.user_id)
      return {
        ...msg,
        userName: profile?.display_name || 'ユーザー',
        userAvatar: profile?.avatar_url || null
      }
    })

  // Process members with their read statuses for this specific channel
  const channelMembers = (memberStatusRes.data || []).map(ms => {
    const profile = hakoMemberMap.get(ms.user_id)
    return {
      user_id: ms.user_id,
      last_read_at: ms.last_read_at,
      display_name: profile?.display_name || 'ユーザー',
      avatar_url: profile?.avatar_url || null,
      role: profile?.role || 'member'
    }
  })

  return { 
    messages: processedMessages, 
    members: channelMembers 
  }
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

    // Get detailed message counts per channel to ensure consistency with the global badge
    const counts = await Promise.all(channelIds.map(async (cid) => {
      const lastRead = readStateMap.get(cid)
      let q = supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('channel_id', cid)
        .neq('user_id', user.id)
      
      if (lastRead) {
        const dTime = new Date(new Date(lastRead).getTime() + 2000).toISOString()
        q = q.gt('created_at', dTime)
      }
      const { count } = await q
      return { id: cid, count: count || 0 }
    }))
    const countMap = new Map(counts.map(c => [c.id, c.count]))

    // Sort pinned channels and recent messages securely
    const sortedChannels = (channels || []).sort((a, b) => {
      const aPinned = a.is_pinned ? 1 : 0
      const bPinned = b.is_pinned ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime()
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime()
      return bTime - aTime
    })

    // Return channels with precise unreadCount matching the global badge
    return sortedChannels.map(ch => ({
      ...ch,
      unreadCount: countMap.get(ch.id) || 0
    }))
  } catch (e) {
    console.error('Unexpected getChatChannels Error:', e)
    return []
  }
}

export async function markChannelAsRead(hakoId: string, channelId: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { success: false }

  // Use current time. Comparisons will handle up to 2 seconds of NTP drift.
  const now = new Date().toISOString()

  // Use admin client if available to bypass any skipped RLS SQL policies
  let success = false
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const { createClient } = await import('@supabase/supabase-js')
    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    const { error: adminError } = await adminSupabase
      .from('chat_channel_members')
      .upsert({ 
        channel_id: channelId, 
        user_id: user.id,
        last_read_at: now 
      }, {
        onConflict: 'channel_id,user_id'
      })
    if (!adminError) success = true
  }

  // Fallback to regular client if admin failed or isn't available
  if (!success) {
    const { error } = await supabase
      .from('chat_channel_members')
      .upsert({ 
        channel_id: channelId, 
        user_id: user.id,
        last_read_at: now 
      }, {
        onConflict: 'channel_id,user_id'
      })
    if (error) {
      console.error('markChannelAsRead Error:', error)
      return { success: false }
    }
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
  
  // First get member IDs and read statuses
  const { data: memberData, error: mError } = await supabase
    .from('chat_channel_members')
    .select('user_id, last_read_at')
    .eq('channel_id', channelId)

  if (mError) {
    console.error('getChannelMembers Error (Ids):', mError)
    return []
  }

  const ids = memberData.map(m => m.user_id)
  if (ids.length === 0) return []

  const readStatusMap: Record<string, string | null> = {}
  memberData.forEach(m => {
    readStatusMap[m.user_id] = m.last_read_at
  })

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

  return (profiles || []).map(p => ({
    ...p,
    last_read_at: readStatusMap[p.user_id] || null
  }))
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


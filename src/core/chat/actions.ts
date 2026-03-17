'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendChatMessage(hakoId: string, content: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: '認証が必要です' }
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      hako_id: hakoId,
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

export async function getChatMessages(hakoId: string, limit = 50) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      metadata
    `)
    .eq('hako_id', hakoId)
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

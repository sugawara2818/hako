import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatView } from '@/components/chat/ChatView'
import { getChatChannels } from '@/core/chat/actions'

export default async function ChatPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ hakoId: string }>,
  searchParams: Promise<{ c?: string }>
}) {
  const { hakoId } = await params
  const { c: initialChannelId } = await searchParams
  const supabase = await createServerSupabaseClient()

  // 1. Fetch current user and check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  // 2. Fetch hako data, member info, and channels concurrently
  const [hakoResponse, memberResponse, initialChannels] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    getChatChannels(hakoId)
  ])

  const { data: hako } = hakoResponse
  const { data: member } = memberResponse

  if (!hako || !member) {
    redirect(`/hako/${hakoId}`)
  }

  const features = hako.features || ['timeline']

  // 3. Check if chat is enabled
  if (!features.includes('chat')) {
    redirect(`/hako/${hakoId}`)
  }

  return (
    <ChatView 
      hakoId={hakoId} 
      currentUserId={user.id} 
      currentUserName={member.display_name || 'ユーザー'} 
      currentUserAvatar={member.avatar_url || null} 
      isOwner={member.role === 'owner'}
      initialChannels={initialChannels}
      initialChannelId={initialChannelId}
    />
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatView } from '@/components/chat/ChatView'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'

export default async function ChatPage({ params }: { params: Promise<{ hakoId: string }> }) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  // 1. Fetch current user and check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  // 2. Fetch hako data and member info concurrently
  const [hakoResponse, memberResponse, countResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId)
  ])

  const { data: hako } = hakoResponse
  const { data: member } = memberResponse
  const { count } = countResponse

  if (!hako || !member) {
    redirect(`/hako/${hakoId}`)
  }

  const features = hako.features || ['timeline']

  // 3. Check if chat is enabled
  if (!features.includes('chat')) {
    redirect(`/hako/${hakoId}`)
  }

  return <ChatView hakoId={hakoId} currentUserId={user.id} />
}

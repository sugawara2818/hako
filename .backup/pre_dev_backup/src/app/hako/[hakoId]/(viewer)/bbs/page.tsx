import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BBSView } from '@/components/bbs/BBSView'

export default async function BBSPage({
  params,
}: {
  params: Promise<{ hakoId: string }>
}) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  const { data: hako } = await supabase
    .from('hako')
    .select('owner_id, features')
    .eq('id', hakoId)
    .single()

  if (!hako) return notFound()
  
  // Check if BBS feature is enabled
  if (!hako.features?.includes('bbs')) {
    return notFound()
  }

  const isOwner = hako.owner_id === user.id

  // Fetch member info for default display name
  const { data: member } = await supabase
    .from('hako_members')
    .select('display_name')
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex-1 flex flex-col h-full">
      <BBSView 
        hakoId={hakoId} 
        isOwner={isOwner} 
        defaultDisplayName={member?.display_name || null} 
      />
    </div>
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ hakoId: string }> }): Promise<Metadata> {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: hako } = await supabase.from('hako').select('name').eq('id', hakoId).single()
  
  const title = hako ? `${hako.name} - Hako` : 'Hako Space'
  
  return {
    title,
    manifest: `/api/manifest/${hakoId}`
  }
}

export default async function HakoSpacePage({ params }: { params: Promise<{ hakoId: string }> }) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  // 1. Check if user is a member
  const { data: member, error: memberError } = await supabase
    .from('hako_members')
    .select('role, display_name')
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    redirect(`/hako/${hakoId}/join`)
  }

  // 2. Fetch hako data
  const { data: hako } = await supabase
    .from('hako')
    .select('*')
    .eq('id', hakoId)
    .single()

  if (!hako) return notFound()

  // 3. Fetch member count
  const { data: members } = await supabase
    .from('hako_members')
    .select('user_id')
    .eq('hako_id', hakoId)

  const isOwner = member.role === 'owner'
  
  // 4. Fetch Timeline Posts
  let initialPosts: any[] = []
  try {
    const { getTimelinePosts } = await import('@/core/timeline/actions')
    initialPosts = await getTimelinePosts(hakoId)
  } catch (err) {
    console.error('Failed to fetch initial posts:', err)
  }

  // 5. Import components
  const { TimelineFeed } = await import('@/components/timeline/TimelineFeed')
  const { HakoViewerLayout } = await import('@/components/hako/hako-viewer-layout')

  return (
    <HakoViewerLayout
      hakoId={hakoId}
      hakoName={hako.name}
      email={user.email!}
      isOwner={isOwner}
      memberCount={members?.length || 0}
      displayName={member?.display_name || null}
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
          
          {/* Timeline Hero Header */}
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
              <h1 className="text-4xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                  タイムライン
              </h1>
          </div>

          <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
             <TimelineFeed 
               hakoId={hakoId} 
               currentUserId={user.id} 
               initialPosts={initialPosts} 
             />
          </div>
      </div>
    </HakoViewerLayout>
  )
}

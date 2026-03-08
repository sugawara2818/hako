import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { ShieldAlert, AtSign } from 'lucide-react'
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
  if (!user) return notFound()

  // 1. Check if user is a member
  const { data: member, error: memberError } = await supabase
    .from('hako_members')
    .select('role')
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
  const { getTimelinePosts } = await import('@/core/timeline/actions')
  const initialPosts = await getTimelinePosts(hakoId)

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
    >
      {/* Content */}
      <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
          
          {/* Timeline Hero Header */}
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                      Timeline Space
                  </div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${isOwner ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                      {isOwner ? <ShieldAlert className="w-3 h-3" /> : <AtSign className="w-3 h-3" />}
                      {isOwner ? 'オーナー' : 'メンバー'}
                  </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                  {hako.name}
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

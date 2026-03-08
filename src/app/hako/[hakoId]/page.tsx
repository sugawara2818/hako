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

  // 1. Fetch current user and check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  // 2. Fetch hako data and member info concurrently
  const [hakoResponse, memberResponse, countResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId)
  ])

  const { data: hako, error: hakoError } = hakoResponse
  const { data: member } = memberResponse
  const { count } = countResponse

  if (hakoError || !hako) {
    return notFound()
  }

  if (!member) {
    return redirect(`/hako/${hakoId}/join`)
  }
  const features = hako.features || ['timeline']

  // 4. Feature Routing Logic
  if (!features.includes('timeline')) {
    if (features.includes('diary')) {
      return redirect(`/hako/${hakoId}/diary`)
    }
    // Fallback if no features are enabled
    const { HakoViewerLayout } = await import('@/components/hako/hako-viewer-layout')
    return (
      <HakoViewerLayout
        hakoId={hako.id}
        hakoName={hako.name}
        iconUrl={hako.icon_url || null}
        iconColor={hako.icon_color || null}
        email={user.email || ''}
        isOwner={member.role === 'owner'}
        memberCount={count || 1}
        displayName={member.display_name}
        features={features}
      >
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500 animate-fade-in">
           <p className="text-xl font-bold mb-2">利用可能な機能がありません</p>
           {member.role === 'owner' && (
             <p className="text-sm">管理ツールの「箱の設定」から機能を有効にしてください。</p>
           )}
        </div>
      </HakoViewerLayout>
    )
  }

  // 5. Fetch Timeline Posts (Timeline is enabled)
  let initialPosts: any[] = []
  try {
    const { getTimelinePosts } = await import('@/core/timeline/actions')
    initialPosts = await getTimelinePosts(hakoId)
  } catch (err) {
    console.error('Failed to fetch initial posts:', err)
  }

  // 6. Import components
  const { TimelineFeed } = await import('@/components/timeline/TimelineFeed')
  const { HakoViewerLayout } = await import('@/components/hako/hako-viewer-layout')

  return (
    <HakoViewerLayout
      hakoId={hako.id}
      hakoName={hako.name}
      iconUrl={hako.icon_url || null}
      iconColor={hako.icon_color || null}
      email={user.email || ''}
      isOwner={member.role === 'owner'}
      memberCount={count || 1}
      displayName={member.display_name}
      features={features}
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

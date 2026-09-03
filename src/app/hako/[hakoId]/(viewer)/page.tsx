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
    if (features.length > 0) {
      // Future-proof routing: Redirect to the first available feature automatically.
      // This assumes that future feature IDs match their sub-route path (e.g., 'diary' -> /diary, 'forum' -> /forum)
      const firstFeature = features[0];
      return redirect(`/hako/${hakoId}/${firstFeature}`)
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
        avatarUrl={member.avatar_url || null}
        features={features}
        userId={user.id}
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

  // 6. Import component
  const { TimelineFeed } = await import('@/components/timeline/TimelineFeed')

  return (
    <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar">
      <TimelineFeed
        hakoId={hakoId}
        currentUserId={user.id}
        initialPosts={initialPosts}
        features={features}
      />
    </div>
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { DiaryPortal } from '@/components/diary/DiaryPortal'
import { fetchDiaryEntries } from '@/core/diary/actions'

export const dynamic = 'force-dynamic'

export default async function DiaryPage({ params }: { params: Promise<{ hakoId: string }> }) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  const [hakoResponse, memberResponse, countResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId)
  ])

  const { data: hako } = hakoResponse
  const { data: member } = memberResponse
  const { count } = countResponse

  if (!hako || !member) return notFound()

  const initialEntries = await fetchDiaryEntries(hakoId)

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
      features={hako.features || ['timeline']}
      userId={user.id}
    >
      <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
        <div className="max-w-2xl mx-auto mb-12 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-black mb-3 heading-gradient">
            日記
          </h1>
        </div>

        <DiaryPortal
          hakoId={hakoId}
          currentUserId={user.id}
          initialEntries={initialEntries}
        />
      </div>
    </HakoViewerLayout>
  )
}

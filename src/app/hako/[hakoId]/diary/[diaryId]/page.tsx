import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { DiaryDetail } from '@/components/diary/DiaryDetail'

export const dynamic = 'force-dynamic'

export default async function DiaryDetailPage({ params }: { params: Promise<{ hakoId: string, diaryId: string }> }) {
  const { hakoId, diaryId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  const [hakoResponse, memberResponse, countResponse, diaryResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId),
    supabase.from('hako_diaries')
      .select(`
        *,
        profiles:user_id (avatar_url, display_name)
      `)
      .eq('id', diaryId)
      .single()
  ])

  const { data: hako } = hakoResponse
  const { data: member } = memberResponse
  const { data: diaryData } = diaryResponse

  if (!hako || !member || !diaryData) return notFound()

  // Separately fetch author's hako-specific name
  const { data: authorMember } = await supabase
    .from('hako_members')
    .select('display_name')
    .eq('hako_id', hakoId)
    .eq('user_id', diaryData.user_id)
    .maybeSingle()

  const diary = {
    ...diaryData,
    hako_members: [{ display_name: authorMember?.display_name || null }]
  }

  // Privacy check: If not public and not author, deny access
  if (!diary.is_public && diary.user_id !== user.id) {
    return notFound()
  }

  return (
    <HakoViewerLayout
      hakoId={hako.id}
      hakoName={hako.name}
      iconUrl={hako.icon_url || null}
      iconColor={hako.icon_color || null}
      email={user.email || ''}
      isOwner={member.role === 'owner'}
      memberCount={countResponse.count || 1}
      displayName={member.display_name}
      features={hako.features || ['timeline']}
    >
      <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
          <DiaryDetail 
            hakoId={hakoId} 
            currentUserId={user.id} 
            entry={diary} 
          />
      </div>
    </HakoViewerLayout>
  )
}

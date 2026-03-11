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

  // 2. Fetch essential Hako and current user membership data
  const [hakoResponse, memberResponse, countResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId)
  ])

  const hako = hakoResponse.data
  const member = memberResponse.data
  const memberCount = countResponse.count || 1

  if (!hako || !member) return notFound()

  // 3. Fetch the specific diary entry
  const { data: diaryData } = await supabase
    .from('hako_diaries')
    .select('*')
    .eq('id', diaryId)
    .single()

  if (!diaryData) return notFound()

  // 4. Privacy Check
  if (!diaryData.is_public && diaryData.user_id !== user.id) {
    return notFound()
  }

  // 5. Fetch Author Profile and Author Hako-specific Identity
  const [profileResponse, authorMemberResponse] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url').eq('id', diaryData.user_id).maybeSingle(),
    supabase.from('hako_members').select('display_name, avatar_url').eq('hako_id', hakoId).eq('user_id', diaryData.user_id).maybeSingle()
  ])

  const profile = profileResponse.data
  const authorMember = authorMemberResponse.data

  // 6. Construct the entry object for DiaryDetail
  // This structure matches exactly what DiaryDetail expects and is very robust
  const diary = {
    ...diaryData,
    profiles: {
      display_name: profile?.display_name || 'ユーザー',
      avatar_url: authorMember?.avatar_url || profile?.avatar_url || null
    },
    hako_members: authorMember ? [{ display_name: authorMember.display_name, avatar_url: authorMember.avatar_url }] : []
  }

  return (
    <HakoViewerLayout
      hakoId={hako.id}
      hakoName={hako.name}
      iconUrl={hako.icon_url || null}
      iconColor={hako.icon_color || null}
      email={user.email || ''}
      isOwner={member.role === 'owner'}
      memberCount={memberCount}
      displayName={member.display_name}
      avatarUrl={member.avatar_url || null}
      features={hako.features || ['timeline']}
      userId={user.id}
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

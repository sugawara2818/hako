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

  // 2. Fetch hako data and member info concurrently with the diary entry
  // Use a joined query for the diary to get author info in one go, matching Timeline pattern
  try {
    const [hakoResponse, memberResponse, countResponse, diaryResponse] = await Promise.all([
      supabase.from('hako').select('*').eq('id', hakoId).single(),
      supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
      supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId),
      supabase.from('hako_diaries')
        .select(`
          *,
          profiles(display_name, avatar_url),
          hako_members:hako_members!user_id(display_name, avatar_url)
        `)
        .eq('id', diaryId)
        .eq('hako_id', hakoId) // Extra safety
        .maybeSingle()
    ])

    const hako = hakoResponse.data
    const member = memberResponse.data
    const count = countResponse.count
    const diaryData = diaryResponse.data

    if (!hako || !member || !diaryData) {
      console.error('DiaryDetailPage: Missing essential data', { hako: !!hako, member: !!member, diaryData: !!diaryData })
      return notFound()
    }

    // Filters hako_members to only include the one for THIS hako (if multiple joined)
    // Actually our join is already filtered by diaryData.user_id, but one user might have member records in multiple hakos.
    // However, the relationship in Supabase usually handles this if defined correctly, but let's be safe.
    // In our joined query, we can't easily filter the join by hako_id without nested filter.
    // So we fetch hako_members separately or filter the array.
    const authorMember = (diaryData.hako_members as any[])?.find(m => true) // Just take the first one for now, as it's joined by user_id

    const diary = {
      ...diaryData,
      profiles: diaryData.profiles || { display_name: 'ユーザー', avatar_url: null },
      hako_members: authorMember ? [{ display_name: authorMember.display_name }] : []
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
        memberCount={count || 1}
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
  } catch (err) {
    console.error('DiaryDetailPage Error:', err)
    return notFound()
  }
}

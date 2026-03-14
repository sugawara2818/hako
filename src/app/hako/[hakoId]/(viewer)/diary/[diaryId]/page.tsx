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
    supabase.from('hako').select('*').eq('id', hakoId).maybeSingle(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId)
  ])

  const hako = hakoResponse.data
  const member = memberResponse.data
  const memberCount = countResponse.count || 1

  // Handle missing hako or membership gracefully without 500ing
  if (!hako || !member) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 bg-black">
        <p>この箱のメンバーではないか、箱が見つかりません。</p>
      </div>
    )
  }

  // 3. Fetch the specific diary entry
  const { data: diaryData, error: diaryError } = await supabase
    .from('hako_diaries')
    .select('*')
    .eq('id', diaryId)
    .maybeSingle()

  // Handle missing diary entry or database error gracefully
  if (diaryError || !diaryData) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 bg-black">
        <p>日記が見つからないか、エラーが発生しました。</p>
      </div>
    )
  }

  // 4. Privacy Check - Strictly compare to avoid null issues
  const isAuthor = diaryData.user_id === user.id
  const isPublic = diaryData.is_public === true

  if (!isPublic && !isAuthor) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-500 bg-black">
        <p>この日記は非公開です。</p>
      </div>
    )
  }

  // 5. Fetch Author Identity
  const [profileResponse, authorMemberResponse] = await Promise.all([
    supabase.from('profiles').select('display_name, avatar_url').eq('id', diaryData.user_id).maybeSingle(),
    supabase.from('hako_members').select('display_name, avatar_url').eq('hako_id', hakoId).eq('user_id', diaryData.user_id).maybeSingle()
  ])

  const profile = profileResponse.data
  const authorMember = authorMemberResponse.data

  // 6. Final Data Assembly
  const diary = {
    ...diaryData,
    profiles: {
      display_name: profile?.display_name || 'ユーザー',
      avatar_url: authorMember?.avatar_url || profile?.avatar_url || null
    },
    hako_members: authorMember ? [{ display_name: authorMember.display_name }] : []
  }

  return (
    <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
      <DiaryDetail 
        hakoId={hakoId} 
        currentUserId={user.id} 
        entry={diary} 
      />
    </div>
  )
}

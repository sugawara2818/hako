import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { DiaryForm } from '@/components/diary/DiaryForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EditDiaryPage({ params }: { params: Promise<{ hakoId: string, diaryId: string }> }) {
  const { hakoId, diaryId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  const [hakoResponse, memberResponse, countResponse, diaryResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId),
    supabase.from('hako_diaries')
      .select('*')
      .eq('id', diaryId)
      .eq('user_id', user.id) // Author check
      .single()
  ])

  const { data: hako } = hakoResponse
  const { data: member } = memberResponse
  const { count } = countResponse
  const { data: diary } = diaryResponse

  if (!hako || !member || !diary) return notFound()

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
    >
      <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
              <Link href={`/hako/${hakoId}/diary/${diaryId}`} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6 font-bold">
                <ChevronLeft className="w-4 h-4" /> 日記に戻る
              </Link>
              <h1 className="text-3xl md:text-4xl font-black text-white">
                  日記を編集
              </h1>
          </div>

          <DiaryForm hakoId={hakoId} initialData={diary} />
      </div>
    </HakoViewerLayout>
  )
}

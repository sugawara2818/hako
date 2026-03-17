import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { DiaryForm } from '@/components/diary/DiaryForm'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function EditDiaryPage({ params, searchParams }: { params: Promise<{ hakoId: string, diaryId: string }>, searchParams: Promise<{ from?: string, date?: string, userId?: string, source?: string }> }) {
  const { hakoId, diaryId } = await params
  const { from, date, userId, source } = await searchParams
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

  const getBackLink = () => {
    // If we came from the detail page, return to it but keep the context
    if (source === 'detail') {
      const sp = new URLSearchParams()
      if (from) sp.set('from', from)
      if (date) sp.set('date', date)
      if (userId) sp.set('userId', userId)
      const query = sp.toString()
      return `/hako/${hakoId}/diary/${diaryId}${query ? `?${query}` : ''}`
    }

    if (from === 'profile' && userId) {
      return `/hako/${hakoId}/user/${userId}?tab=diary`
    }
    if (from === 'list' && date) {
      return `/hako/${hakoId}/diary?view=list&date=${date}`
    }
    if (from === 'list') {
      return `/hako/${hakoId}/diary?view=list`
    }
    return `/hako/${hakoId}/diary/${diaryId}`
  }

  return (
    <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
          <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
              <Link href={getBackLink()} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6 font-bold">
                <ChevronLeft className="w-4 h-4" /> 戻る
              </Link>
              <h1 className="text-3xl md:text-4xl font-black text-white">
                  日記を編集
              </h1>
          </div>

          <DiaryForm hakoId={hakoId} initialData={diary} />
      </div>
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { CalendarClient } from '@/components/calendar/CalendarClient'
import { fetchCalendarEvents } from '@/core/calendar/actions'
import { startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function CalendarPage({ params }: { params: Promise<{ hakoId: string }> }) {
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

  // Fetch initial events (generous range)
  const now = new Date()
  const start = startOfMonth(subMonths(now, 1)).toISOString()
  const end = endOfMonth(addMonths(now, 2)).toISOString()
  const initialEvents = await fetchCalendarEvents(hakoId, start, end)

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
      <div className="flex-1 flex flex-col min-h-0 bg-black overflow-hidden">
        {/* Page Header (Desktop) */}
        <div className="hidden md:block px-8 py-6 border-b theme-border bg-white/[0.02]">
           <h1 className="text-3xl font-black heading-gradient">
             共有カレンダー
           </h1>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          <CalendarClient
            hakoId={hakoId}
            currentUserId={user.id}
            initialEvents={initialEvents}
          />
        </div>
      </div>
    </HakoViewerLayout>
  )
}

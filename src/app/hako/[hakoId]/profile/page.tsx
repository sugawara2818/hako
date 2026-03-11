import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { UsernameEditor } from '@/components/hako/username-editor'
import { UserAvatarUpload } from '@/components/hako/user-avatar-upload'
import { Hash, BookOpen } from 'lucide-react'
import { TimelineFeed } from '@/components/timeline/TimelineFeed'

export const dynamic = 'force-dynamic'

interface ProfilePageProps {
  params: Promise<{ hakoId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { hakoId } = await params
  const { tab } = await searchParams
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  const [hakoResponse, memberResponse, countResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId)
  ])

  const { data: hako, error: hakoError } = hakoResponse
  const { data: member } = memberResponse
  const { count } = countResponse

  if (hakoError || !hako || !member) return notFound()

  const features = hako.features || ['timeline']
  const activeTab = tab || (features.includes('timeline') ? 'timeline' : features[0])

  // Fetch content based on tab
  let initialPosts: any[] = []
  let initialDiaries: any[] = []
  
  if (activeTab === 'timeline') {
    const { getTimelinePosts } = await import('@/core/timeline/actions')
    initialPosts = await getTimelinePosts(hakoId, { userId: user.id }) // Only user's posts
  } else if (activeTab === 'diary') {
    const { fetchDiaryEntries } = await import('@/core/diary/actions')
    initialDiaries = await fetchDiaryEntries(hakoId, { userId: user.id })
  }

  // Simplified delete handler for diary (server component doesn't have it, but we can pass a dummy or use a client wrapper if needed)
  // Actually DiaryFeed is a client component, but we are passing initial data.
  // The onDelete in DiaryFeed is a prop. I'll need to handle it or make a small wrapper.
  // wait, DiaryFeed is imported in ProfilePage (server component). 
  // I should probably make a small client wrapper for the Diary tab if I want full interactivity, 
  // OR just let the DiaryFeed handle its own state if I move the logic there.
  // For now, I'll just import the client components.

  const { DiaryFeed } = await import('@/components/diary/DiaryFeed')

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
    >
      <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar">
        {/* Profile Header */}
        <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
            <UserAvatarUpload 
              hakoId={hakoId}
              avatarUrl={member.avatar_url || null}
              size={120}
              className="ring-4 ring-purple-500/20 rounded-full"
            />
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-3">
                <UsernameEditor hakoId={hakoId} currentName={member.display_name || user.email?.split('@')[0] || ''} />
                <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${member.role === 'owner' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                    {member.role === 'owner' ? 'Owner' : 'Member'}
                </div>
              </div>
              <p className="text-gray-500 font-medium">{user.email}</p>
            </div>
          </div>

          {/* Dynamic Tabs */}
          <div className="flex items-center gap-1 border-b theme-border mb-8 overflow-x-auto no-scrollbar">
            {features.includes('timeline') && (
              <Link
                href={`?tab=timeline`}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${activeTab === 'timeline' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Hash className="w-4 h-4" />
                投稿
              </Link>
            )}
            {features.includes('diary') && (
              <Link
                href={`?tab=diary`}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${activeTab === 'diary' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <BookOpen className="w-4 h-4" />
                日記
              </Link>
            )}
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'timeline' && (
              <div className="max-w-2xl">
                {initialPosts.length > 0 ? (
                  <TimelineFeed
                    hakoId={hakoId}
                    currentUserId={user.id}
                    initialPosts={initialPosts}
                  />
                ) : (
                  <div className="py-20 text-center space-y-4 theme-surface rounded-3xl border theme-border">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <Hash className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-500 font-medium">まだ投稿がありません</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'diary' && (
              <div className="max-w-2xl">
                {initialDiaries.length > 0 ? (
                  <DiaryFeed
                    hakoId={hakoId}
                    currentUserId={user.id}
                    entries={initialDiaries}
                    onDelete={async (id) => {
                      'use server'
                      const { deleteDiaryEntry } = await import('@/core/diary/actions')
                      await deleteDiaryEntry(id, hakoId)
                    }}
                  />
                ) : (
                  <div className="py-20 text-center space-y-4 theme-surface rounded-3xl border theme-border">
                    <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                        <BookOpen className="w-8 h-8 text-gray-600" />
                    </div>
                    <p className="text-gray-500 font-medium">まだ日記がありません</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </HakoViewerLayout>
  )
}

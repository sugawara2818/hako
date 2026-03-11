import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { UsernameEditor } from '@/components/hako/username-editor'
import { UserAvatarUpload } from '@/components/hako/user-avatar-upload'
import { Hash, BookOpen, Settings2 } from 'lucide-react'
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
  if (activeTab === 'timeline') {
    const { getTimelinePosts } = await import('@/core/timeline/actions')
    initialPosts = await getTimelinePosts(hakoId, { userId: user.id }) // Only user's posts
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
              <a
                href={`?tab=timeline`}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${activeTab === 'timeline' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <Hash className="w-4 h-4" />
                投稿
              </a>
            )}
            {features.includes('diary') && (
              <a
                href={`?tab=diary`}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${activeTab === 'diary' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
              >
                <BookOpen className="w-4 h-4" />
                日記
              </a>
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
              <div className="py-20 text-center space-y-4 theme-surface rounded-3xl border theme-border">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <BookOpen className="w-8 h-8 text-gray-600" />
                </div>
                <p className="text-gray-500 font-medium whitespace-pre-wrap">日記一覧は検討中です。{"\n"}（通常の日記ページから確認できます）</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </HakoViewerLayout>
  )
}

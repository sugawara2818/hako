import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { HakoViewerLayout } from '@/components/hako/hako-viewer-layout'
import { UsernameEditor } from '@/components/hako/username-editor'
import { UserAvatarUpload } from '@/components/hako/user-avatar-upload'
import { Hash, BookOpen } from 'lucide-react'
import { ProfileBackButton } from '@/components/hako/profile-back-button'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

interface ProfilePageProps {
  params: Promise<{ hakoId: string, userId: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function ProfilePage({ params, searchParams }: ProfilePageProps) {
  const { hakoId, userId: targetUserId } = await params
  const { tab } = await searchParams
  const supabase = await createServerSupabaseClient()

  // 1. Fetch current authenticated user
  const { data: { user: currentUser } } = await supabase.auth.getUser()
  if (!currentUser) redirect(`/hako/${hakoId}/login`)

  // 2. Fetch hako data, member info for target user, and current user's member info for layout
  const [hakoResponse, targetMemberResponse, currentMemberResponse, countResponse] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', targetUserId).maybeSingle(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', currentUser.id).maybeSingle(),
    supabase.from('hako_members').select('*', { count: 'exact', head: true }).eq('hako_id', hakoId)
  ])

  const { data: hako, error: hakoError } = hakoResponse
  const { data: targetMember } = targetMemberResponse
  const { data: currentMember } = currentMemberResponse
  const { count } = countResponse

  if (hakoError || !hako || !targetMember || !currentMember) return notFound()

  const isOwnProfile = currentUser.id === targetUserId
  const features = hako.features || ['timeline']
  const activeTab = tab || (features.includes('timeline') ? 'timeline' : features[0])

  // 3. Fetch content
  const { getTimelinePosts } = await import('@/core/timeline/actions')
  const { fetchDiaryEntries } = await import('@/core/diary/actions')
  const { getGalleryImages, getAlbums } = await import('@/core/gallery/actions')
  
  const [initialPosts, initialDiaries, allGalleryImages, albums] = await Promise.all([
    getTimelinePosts(hakoId, { userId: targetUserId }),
    fetchDiaryEntries(hakoId, { userId: targetUserId }),
    getGalleryImages(hakoId, 'discovery'),
    getAlbums(hakoId)
  ])

  const userGalleryImages = allGalleryImages.filter((img: any) => img.userId === targetUserId || img.user_id === targetUserId)

  const { TimelineFeed } = await import('@/components/timeline/TimelineFeed')
  const { GalleryGrid } = await import('@/components/gallery/GalleryGrid')
  const { DiaryFeed } = await import('@/components/diary/DiaryFeed')
  const { Image: LucideImageIcon } = await import('lucide-react')

  return (
    <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar">
      {/* Profile Header */}
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12 animate-fade-in">
        <ProfileBackButton />
        <div className="flex flex-col md:flex-row items-center gap-6 mb-12">
          {isOwnProfile ? (
            <UserAvatarUpload 
              hakoId={hakoId}
              avatarUrl={targetMember.avatar_url || null}
              size={120}
              className="ring-4 ring-purple-500/20 rounded-full"
            />
          ) : (
            <div className="w-[120px] h-[120px] rounded-full overflow-hidden ring-4 ring-purple-500/10 shrink-0 border theme-border bg-gradient-to-br from-gray-800 to-gray-950 flex items-center justify-center">
              {targetMember.avatar_url ? (
                <Image 
                  src={targetMember.avatar_url} 
                  alt="" 
                  width={120} 
                  height={120} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 font-bold text-4xl">
                  {targetMember.display_name?.charAt(0) || '?'}
                </div>
              )}
            </div>
          )}
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row items-center justify-center md:justify-start gap-x-3 gap-y-1">
              {isOwnProfile ? (
                <UsernameEditor hakoId={hakoId} currentName={targetMember.display_name || ''} />
              ) : (
                <h1 className="text-2xl font-black theme-text leading-none">{targetMember.display_name || 'ユーザー'}</h1>
              )}
              <div className={`px-2 py-0.5 rounded-full border text-[10px] font-bold self-center md:self-auto ${targetMember.role === 'owner' ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                  {targetMember.role === 'owner' ? 'Owner' : 'Member'}
              </div>
            </div>
            <p className="text-gray-500 font-medium">@{targetUserId.substring(0, 8)}</p>
          </div>
        </div>

        {/* Dynamic Tabs */}
        <div className="flex items-center gap-1 border-b theme-border mb-8 overflow-x-auto no-scrollbar">
          {features.includes('timeline') && (
            <Link
              href={`/hako/${hakoId}/user/${targetUserId}?tab=timeline`}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${activeTab === 'timeline' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <Hash className="w-4 h-4" />
              投稿
            </Link>
          )}
          {features.includes('diary') && (
            <Link
              href={`/hako/${hakoId}/user/${targetUserId}?tab=diary`}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${activeTab === 'diary' ? 'border-blue-500 text-blue-400 bg-blue-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
            >
              <BookOpen className="w-4 h-4" />
              日記
            </Link>
          )}
          {features.includes('gallery') && (
            <Link
              href={`/hako/${hakoId}/user/${targetUserId}?tab=gallery`}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-all font-bold text-sm whitespace-nowrap ${
                activeTab === 'gallery' 
                  ? 'border-[#82d9bc] text-[#82d9bc] bg-[#82d9bc]/5' 
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              <LucideImageIcon className={`w-4 h-4 ${activeTab === 'gallery' ? 'text-emerald-400' : ''}`} />
              ギャラリー
            </Link>
          )}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'timeline' && (
            <div className="w-full">
              {initialPosts.length > 0 ? (
                <TimelineFeed
                  hakoId={hakoId}
                  currentUserId={currentUser.id}
                  initialPosts={initialPosts}
                  hideHeader={true}
                  isFullWidth={true}
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
                <div className="space-y-4">
                  {initialDiaries.length > 0 ? (
                    <DiaryFeed
                      hakoId={hakoId}
                      currentUserId={currentUser.id}
                      entries={initialDiaries}
                      isProfileView={true}
                      onDelete={isOwnProfile ? async (id) => {
                        'use server'
                        const { deleteDiaryEntry } = await import('@/core/diary/actions')
                        await deleteDiaryEntry(id, hakoId)
                      } : undefined}
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
              </div>
          )}
          
          {activeTab === 'gallery' && (
            <div className="max-w-4xl -mx-4 md:mx-0">
              <GalleryGrid 
                images={userGalleryImages} 
                albums={albums} 
                hakoId={hakoId}
                columns={3}
                onDelete={isOwnProfile ? async (id: string) => {
                  'use server'
                  const { toggleGalleryPin } = await import('@/core/gallery/actions')
                  await toggleGalleryPin(id, hakoId, false)
                } : undefined}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

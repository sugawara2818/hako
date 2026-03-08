import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Hash, Users, ShieldAlert, LogOut, Settings, AtSign, LayoutDashboard, Home } from 'lucide-react'
import { signOut } from '@/core/auth/actions'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ hakoId: string }> }): Promise<Metadata> {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: hako } = await supabase.from('hako').select('name').eq('id', hakoId).single()
  
  const title = hako ? `${hako.name} - Hako` : 'Hako Space'
  
  return {
    title,
    manifest: `/api/manifest/${hakoId}`
  }
}

export default async function HakoSpacePage({ params }: { params: Promise<{ hakoId: string }> }) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  // 1. Check if user is a member
  const { data: member, error: memberError } = await supabase
    .from('hako_members')
    .select('role')
    .eq('hako_id', hakoId)
    .eq('user_id', user.id)
    .single()

  if (memberError || !member) {
    redirect(`/hako/${hakoId}/join`)
  }

  // 2. Fetch hako data
  const { data: hako } = await supabase
    .from('hako')
    .select('*')
    .eq('id', hakoId)
    .single()

  if (!hako) return notFound()

  // 3. Fetch all members with their emails (kept for sidebar reference but simplified here)
  const { data: membersWithEmail } = await supabase
    .from('hako_members')
    .select('role, user_id')
    .eq('hako_id', hakoId)

  const isOwner = member.role === 'owner'
  
  // 4. Fetch Timeline Posts
  const { getTimelinePosts } = await import('@/core/timeline/actions')
  const initialPosts = await getTimelinePosts(hakoId)

  // 5. Import components
  const { TimelineFeed } = await import('@/components/timeline/TimelineFeed')
  const { InstallButton } = await import('@/components/hako/install-button')
  const { UserMenu } = await import('@/components/hako/user-menu')

  return (
    <div className="min-h-screen bg-[#050505] text-white flex font-sans overflow-hidden">

      {/* Dynamic Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-white/5 bg-black/50 backdrop-blur-xl h-screen sticky top-0 flex flex-col z-10 hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-white/5 gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm shadow-lg shadow-purple-500/20">
            H
          </div>
          <span className="font-bold truncate">{hako.name}</span>
        </div>

        <nav className="flex-1 p-4 space-y-4 overflow-y-auto no-scrollbar">
          <div className="space-y-1">
            <p className="px-4 text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">メニュー</p>
            <Link href={`/hako/${hakoId}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/10 text-white font-bold transition-all border border-white/5">
              <Hash className="w-5 h-5 text-purple-400" />
              タイムライン
            </Link>
            <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 transition-all font-bold">
              <Users className="w-5 h-5" />
              メンバー ({membersWithEmail?.length || 0})
            </Link>
          </div>

          {isOwner && (
            <div className="space-y-1">
              <p className="px-4 text-[10px] font-black text-blue-500/50 uppercase tracking-widest mb-2">管理ツール</p>
              <Link href="/owner/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl text-blue-400/70 hover:text-blue-400 hover:bg-blue-500/10 transition-all font-bold">
                  <LayoutDashboard className="w-5 h-5" /> 一覧へ戻る
              </Link>
              <Link href={`/owner/hako/${hakoId}`} className="flex items-center gap-3 px-4 py-3 rounded-2xl text-purple-400/70 hover:text-purple-400 hover:bg-purple-500/10 transition-all font-bold">
                  <Settings className="w-5 h-5" /> 箱の設定
              </Link>
            </div>
          )}

          <div className="pt-4 px-2">
             <InstallButton variant="sidebar" />
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 bg-black/40">
           <UserMenu email={user.email!} hakoId={hakoId} isOwner={isOwner} />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen relative z-10">
         {/* Mobile Header */}
         <header className="md:hidden h-16 border-b border-white/5 flex items-center justify-between px-4 glass sticky top-0 z-50">
             <div className="flex items-center">
                 <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm mr-3">H</div>
                 <span className="font-bold truncate max-w-[150px]">{hako.name}</span>
             </div>
             <div className="flex items-center gap-1">
                 <InstallButton variant="icon" />
                 <div className="w-[1px] h-4 bg-white/10 mx-1" />
                 <UserMenu email={user.email!} hakoId={hakoId} isOwner={isOwner} />
             </div>
          </header>

         {/* Content */}
         <div className="flex-1 overflow-y-auto w-full mx-auto p-4 md:p-8 hide-scrollbar">
             
             {/* Timeline Hero Header */}
             <div className="max-w-2xl mx-auto mb-8 animate-fade-in">
                 <div className="flex flex-wrap items-center gap-2 mb-4">
                     <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-medium">
                         Timeline Space
                     </div>
                     <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${isOwner ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                         {isOwner ? <ShieldAlert className="w-3 h-3" /> : <AtSign className="w-3 h-3" />}
                         {isOwner ? 'オーナー' : 'メンバー'}
                     </div>
                 </div>
                 <h1 className="text-4xl md:text-5xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                     {hako.name}
                 </h1>
             </div>

             <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <TimelineFeed 
                  hakoId={hakoId} 
                  currentUserId={user.id} 
                  initialPosts={initialPosts} 
                />
             </div>
         </div>
      </main>
    </div>
  )
}

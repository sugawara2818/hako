import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { Settings, Users, ArrowUpRight, Copy, Share2, LayoutDashboard, ArrowLeft, LogOut } from 'lucide-react'
import { signOut } from '@/core/auth/actions'
import { CopyInviteLink } from '@/components/hako/copy-invite-link'

export default async function OwnerDashboardPage({
  params,
}: {
  params: Promise<{ hakoId: string }>
}) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (!user) {
    return <div className="p-8 text-white grid gap-4 bg-black h-screen"><h1>Auth Error</h1><pre>{JSON.stringify(authError, null, 2)}</pre><p>User is null. Cookie might not be set.</p></div>
  }

  // Fetch hako details to ensure user is owner
  const { data: hako, error: hakoError } = await supabase
    .from('hako')
    .select('*')
    .eq('id', hakoId)
    .single()

  if (hakoError || !hako) {
    return <div className="p-8 text-white grid gap-4 bg-black h-screen"><h1>Hako Fetch Error</h1><pre>{JSON.stringify(hakoError, null, 2)}</pre><p>Hako not found or RLS blocked.</p></div>
  }

  if (hako.owner_id !== user.id) {
    return <div className="p-8 text-white bg-black h-screen">User is not the owner of this Hako</div>
  }

  // Fetch members count (mock simple logic)
  const { count } = await supabase
    .from('hako_members')
    .select('*', { count: 'exact', head: true })
    .eq('hako_id', hakoId)

  // Dynamically generate the base URL using the incoming request headers
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3000'
  const protocol = process.env.NODE_ENV === 'development' ? 'http' : 'https'
  const joinLink = `${protocol}://${host}/hako/${hakoId}/join`

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Sidebar/Nav Mock */}
      <nav className="fixed top-0 w-full glass border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-2 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5 md:gap-3 min-w-0 flex-1">
            <Link href="/owner/dashboard" className="flex items-center gap-1 md:gap-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors px-1.5 md:px-3 py-2 -ml-1.5 md:-ml-3 rounded-xl group shrink-0">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium hidden sm:inline">一覧に戻る</span>
            </Link>
            <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs md:text-sm shrink-0 overflow-hidden">
              {hako.icon_url ? <img src={hako.icon_url} alt="" className="w-full h-full object-cover" /> : (hako.name?.charAt(0) || 'H')}
            </div>
            <span className="font-bold text-sm md:text-lg truncate flex-1 min-w-0">{hako.name}</span>
            <span className="px-1.5 md:px-2 py-0.5 rounded-full bg-white/10 text-[10px] md:text-xs font-medium text-gray-400 shrink-0 hidden sm:inline-block whitespace-nowrap">Owner</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0 pl-2">
            <Link 
              href={`/hako/${hako.id}`}
              className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-gray-400 hover:text-white transition-colors whitespace-nowrap"
              target="_blank"
            >
              <span className="hidden sm:inline">箱を見る</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
            <div className="h-4 w-[1px] bg-white/10 mx-0.5 md:mx-1" />
            <form action={signOut}>
                <button type="submit" className="text-xs md:text-sm font-medium text-gray-400 hover:text-red-400 flex items-center gap-1 md:gap-2 transition-colors whitespace-nowrap" title="ログアウト">
                    <LogOut className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">ログアウト</span>
                </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-24 pb-12">
        <div className="mb-8 md:mb-10 animate-fade-in">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">ダッシュボード</h1>
          <p className="text-sm md:text-base text-gray-400">箱の運営状況と各種設定を管理します。</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 min-w-0">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="glass-card p-6 rounded-2xl border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-gray-400 font-medium text-sm">総メンバー数</span>
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-4xl font-bold">{count || 1}</div>
                <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3 h-3" /> +1 今週
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-white/5 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div>
                    <span className="text-gray-400 font-medium text-sm block mb-1">今月の売上 (プレビュー)</span>
                    <div className="text-3xl font-bold">¥0</div>
                  </div>
                  <button className="text-xs text-purple-400 hover:text-purple-300 font-medium flex items-center gap-1 mt-4">
                    決済設定を開く <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>



          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 animate-fade-in min-w-0" style={{ animationDelay: '0.3s' }}>
            
            {/* Invite Card */}
            <div className="p-6 rounded-2xl border border-purple-500/20 bg-gradient-to-b from-purple-900/20 to-black relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px]" />
              <h2 className="text-lg font-bold mb-2 relative z-10 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-purple-400" />
                ユーザーを招待
              </h2>
              <p className="text-sm text-gray-400 mb-6 relative z-10 leading-relaxed">
                以下の専用リンクをSNS等でシェアして、あなたの箱にユーザーを招待しましょう。
              </p>
              
              <CopyInviteLink joinLink={joinLink} />
            </div>

            {/* Hako Settings */}
            <div id="settings" className="glass p-6 md:p-8 rounded-3xl border border-white/5 shadow-2xl animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
                <Settings className="w-5 h-5 text-purple-400" />
                箱の基本設定
              </h2>
              
              <HakoSettingsForm 
                hakoId={hako.id} 
                initialName={hako.name} 
                initialIconUrl={hako.icon_url || null} 
                initialIconColor={hako.icon_color || null}
                initialFeatures={hako.features || ['timeline']}
              />
            </div>

            {/* Quick Links */}
            <div className="glass p-6 rounded-3xl border border-white/5 shadow-xl">
              <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4">クイックリンク</h2>
              <div className="space-y-2">
                <Link href={`/hako/${hako.id}`} target="_blank" className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors text-sm text-gray-300 font-medium flex items-center justify-between group">
                  <span className="truncate pr-2">パブリック表示を確認</span>
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors shrink-0" />
                </Link>
                <button className="w-full text-left px-4 py-3 rounded-2xl hover:bg-white/5 transition-colors text-sm text-gray-300 font-medium flex items-center justify-between group opacity-50 cursor-not-allowed">
                  <span className="truncate pr-2">メンバー管理 (近日公開)</span>
                  <Users className="w-4 h-4 text-gray-600 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

// Add HakoSettingsForm import if missing
import { HakoSettingsForm } from '@/components/hako/hako-settings-form'


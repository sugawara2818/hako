import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Settings, Users, ArrowUpRight, Copy, Share2, Globe, LayoutDashboard, ArrowLeft, LogOut } from 'lucide-react'
import { signOut } from '@/core/auth/actions'

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

  const joinLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/hako/${hakoId}/join`

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans">
      {/* Sidebar/Nav Mock */}
      <nav className="fixed top-0 w-full glass border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/owner/dashboard" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white hover:bg-white/10 transition-colors px-3 py-2 -ml-3 rounded-xl group">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium hidden sm:inline">一覧に戻る</span>
            </Link>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center font-bold text-sm ml-2">
              H
            </div>
            <span className="font-bold text-lg">{hako.name}</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10 text-xs font-medium text-gray-400 ml-2">Owner</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href={`/hako/${hako.id}`}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
              target="_blank"
            >
              箱を見る <ArrowUpRight className="w-4 h-4" />
            </Link>
            <div className="h-4 w-[1px] bg-white/10 mx-1" />
            <form action={signOut}>
                <button type="submit" className="text-sm font-medium text-gray-400 hover:text-red-400 flex items-center gap-2 transition-colors">
                    <LogOut className="w-4 h-4" /> ログアウト
                </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-24 pb-12">
        <div className="mb-10 animate-fade-in">
          <h1 className="text-3xl font-bold mb-2">ダッシュボード</h1>
          <p className="text-gray-400">箱の運営状況と各種設定を管理します。</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
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

            {/* Active Features */}
            <div className="glass p-6 rounded-2xl border border-white/5 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-gray-400" />
                有効な機能ピース
              </h2>
              <div className="space-y-3">
                {[
                  { name: 'タイムライン', status: '有効', icon: Users },
                  { name: 'ブログ機能', status: '停止中', icon: Globe }
                ].map((feature, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/50 hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                        <feature.icon className="w-5 h-5 text-gray-400" />
                      </div>
                      <span className="font-medium">{feature.name}</span>
                    </div>
                    {feature.status === '有効' ? (
                      <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold">稼働中</span>
                    ) : (
                      <button className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors">
                        有効化する
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Right Sidebar */}
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            
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
              
              <div className="relative z-10">
                <div className="bg-black/80 border border-white/10 rounded-xl p-3 flex items-center justify-between group">
                  <span className="text-sm text-gray-300 truncate mr-2 font-mono">
                    {joinLink}
                  </span>
                  <button 
                    className="p-2 bg-white/10 hover:bg-purple-500/50 hover:text-white rounded-lg transition-all text-gray-400 shrink-0"
                    title="URLをコピー"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Settings */}
            <div className="glass p-6 rounded-2xl border border-white/5">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-400" />
                設定
              </h2>
              <div className="space-y-2">
                <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-gray-300 font-medium flex items-center justify-between group">
                  箱の基本情報
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </button>
                <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-gray-300 font-medium flex items-center justify-between group">
                  デザインカスタマイズ
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </button>
                <button className="w-full text-left px-4 py-3 rounded-xl hover:bg-white/5 transition-colors text-sm text-gray-300 font-medium flex items-center justify-between group">
                  決済連携 (Coming Soon)
                  <ArrowUpRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  )
}

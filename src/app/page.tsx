import Link from 'next/link'
import { Sparkles, Blocks, Users, ArrowRight, Zap, Shield, Globe } from 'lucide-react'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { signOut } from '@/core/auth/actions'

export default async function Home() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-8 py-6 glass border-b-0 sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Blocks className="w-8 h-8 text-purple-500" />
            <span className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              hako
            </span>
          </div>
          <div className="flex items-center gap-6">
            {!isLoggedIn ? (
              <>
                <Link 
                  href="/auth/login"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  ログイン
                </Link>
                <Link 
                  href="/auth/owner/signup"
                  className="px-6 py-2.5 rounded-full bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 hover:text-purple-300 transition-all text-sm font-bold backdrop-blur-md border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                >
                  オーナーになる
                </Link>
              </>
            ) : (
              <>
                <Link 
                  href="/owner/dashboard"
                  className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
                >
                  ダッシュボード
                </Link>
                <form action={signOut}>
                  <button type="submit" className="px-6 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-300 transition-all text-sm font-bold backdrop-blur-md border border-white/10">
                    ログアウト
                  </button>
                </form>
              </>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <main className="container mx-auto px-4 pt-32 pb-24 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-purple-500/30 text-purple-300 text-sm font-medium mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4" />
            <span>新しいSNSのカタチ</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <span className="block text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">
              あなたの世界を
            </span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400 animate-gradient-x">
              箱におさめる
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mb-12 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            アプリ作成代行 × 閉鎖的SNS。
            <br />
            機能ピースを組み合わせて、あなただけの特別な空間を作ろう。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <Link 
              href={isLoggedIn ? "/owner/hako/create" : "/auth/owner/signup?intent=create"}
              className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-pink-200 opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="relative flex items-center gap-2">
                無料で箱を作る <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          </div>

          {/* Abstract Platform Visual */}
          <div className="mt-24 relative w-full max-w-5xl aspect-video rounded-2xl glass-card overflow-hidden animate-fade-in p-1 border border-white/10" style={{ animationDelay: '0.4s' }}>
             <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10" />
             <div className="h-full w-full rounded-xl bg-black/50 backdrop-blur-3xl border border-white/5 flex items-center justify-center relative overflow-hidden">
                {/* Visual Elements representing standard app pieces */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-purple-500/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-pink-500/20 rounded-full animate-ping" style={{ animationDuration: '4s', animationDelay: '1s' }} />
                
                <div className="grid grid-cols-3 gap-6 p-8 relative z-10 w-full max-w-3xl">
                  {[
                    { icon: Users, label: 'SNS機能', delay: '0s' },
                    { icon: Globe, label: 'ブログ機能', delay: '0.2s' },
                    { icon: Shield, label: '決済・会員管理', delay: '0.4s' }
                  ].map((item, i) => (
                    <div key={i} className="glass-card p-6 rounded-2xl flex flex-col items-center justify-center gap-4 hover:-translate-y-2 transition-transform cursor-pointer" style={{ animationDelay: item.delay }}>
                      <item.icon className="w-10 h-10 text-purple-400" />
                      <span className="font-medium text-gray-300">{item.label}</span>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </main>

        {/* Features Section */}
        <section id="features" className="py-24 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4">複雑な構築は、すべて運営にお任せ</h2>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                あなたは「機能ピース」を選ぶだけ。カスタマイズ性の高い独自のクローズドコミュニティがすぐに完成します。
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  title: '直感的なカスタマイズ',
                  description: 'タイムライン、掲示板、ブログなど、必要なモジュールを組み合わせるだけでアプリが完成。',
                  icon: Blocks
                },
                {
                  title: '独自の経済圏',
                  description: '月額課金設定や単品販売も可能。ユーザーは箱に入るために入場料を支払います。',
                  icon: Zap
                },
                {
                  title: '完全なプライベート空間',
                  description: '検索エンジンや外部からは見えない、安心のクローズド空間を提供します。',
                  icon: Shield
                }
              ].map((feature, i) => (
                <div key={i} className="glass border-white/5 p-8 rounded-3xl hover:bg-white/5 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-6">
                    <feature.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-white/10 text-center text-gray-500 text-sm">
          <p>© 2026 hako Inc. All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}
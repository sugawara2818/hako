import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Blocks, Plus, Settings, Hash, LogOut, ArrowRight, AtSign } from 'lucide-react'
import { signOut } from '@/core/auth/actions'
import { getHakoGradient } from '@/lib/hako-utils'
import Image from 'next/image'
import { DashboardClient } from './dashboard-client'

export const dynamic = 'force-dynamic'

export default async function OwnerDashboardPage() {
  const supabase = await createServerSupabaseClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/auth/login')
  }

  // 1. Fetch memberships first
  const { data: memberships, error: memberError } = await supabase
    .from('hako_members')
    .select('hako_id, role')
    .eq('user_id', user.id)
    .eq('role', 'owner')

  if (memberError || !memberships || memberships.length === 0) {
    // No hakos owned - we'll handle this in the UI below
  }

  // 2. Fetch the actual Hako details
  let ownedHakos: any[] = []
  if (memberships && memberships.length > 0) {
    const hakoIds = memberships.map(m => m.hako_id)
    const { data, error: hakosError } = await supabase
      .from('hako')
      .select('id, name, created_at, icon_url, icon_color, sort_order')
      .in('id', hakoIds)
      .order('sort_order', { ascending: true })

    if (!hakosError && data) {
      ownedHakos = data
    }
  }

  const hasHakos = ownedHakos.length > 0;

  return (
    <div className="min-h-screen theme-bg theme-text flex flex-col font-sans relative overflow-hidden">

      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <header className="h-16 border-b theme-border flex items-center justify-between px-4 md:px-6 theme-surface/80 backdrop-blur-md sticky top-0 z-50">
        <Link href="/owner/dashboard" className="flex items-center gap-2 theme-text shrink-0">
          <Blocks className="w-5 h-5 md:w-6 md:h-6 text-purple-500" />
          <span className="font-bold tracking-tight text-sm md:text-base">Hako Admin</span>
        </Link>

        <div className="flex items-center gap-3 md:gap-4 shrink-0">
          <Link href="/" className="text-xs md:text-sm font-medium theme-muted hover:theme-text transition-colors">
            トップへ
          </Link>
          <div className="h-4 w-[1px] theme-border" />
          <form action={signOut}>
            <button type="submit" className="text-xs md:text-sm font-medium theme-muted hover:theme-text flex items-center gap-1.5 md:gap-2 transition-colors">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">ログアウト</span>
            </button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 md:p-12 relative z-10 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-8 md:mb-12 border-b theme-border pb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black mb-2 heading-gradient">
              マイダッシュボード
            </h1>
            <div className="flex items-center gap-2 mb-3">
              <AtSign className="w-4 h-4 theme-muted" />
              <span className="text-sm md:text-base font-medium theme-muted">
                {user.email}
              </span>
            </div>
            <p className="theme-muted text-sm md:text-base">作成した箱（Hako）の管理と新しい箱を作成できます。</p>
          </div>
          <Link
            href="/owner/hako/create"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:scale-105 active:scale-95 transition-all w-full md:w-auto shrink-0 shadow-lg shadow-purple-500/20"
          >
            <Plus className="w-5 h-5" /> 新しい箱を作成
          </Link>
        </div>

        {hasHakos ? (
          <DashboardClient initialHakos={ownedHakos} />
        ) : (
          <div className="max-w-2xl mx-auto py-8 md:py-20 animate-fade-in">
            <div className="theme-elevated p-6 sm:p-8 md:p-12 rounded-[2rem] md:rounded-[2.5rem] border theme-border text-center relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-[80px] -mr-32 -mt-32" />
              <div className="relative z-10">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl md:rounded-3xl flex items-center justify-center mx-auto mb-6 md:mb-8 shadow-xl shadow-purple-500/20">
                  <Blocks className="w-8 h-8 md:w-10 md:h-10 text-white" />
                </div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3 md:mb-4">ようこそ、hakoへ！</h2>
                <p className="theme-muted text-sm sm:text-base md:text-lg mb-8 md:mb-10 leading-relaxed px-2">
                  あなたが所有している箱（Hako）はまだありません。<br className="hidden md:block" />
                  最初の箱を作成して、あなただけの特別な空間を構築しましょう。
                </p>
                <Link
                  href="/owner/hako/create"
                  className="inline-flex items-center justify-center gap-2 md:gap-3 px-6 md:px-10 py-3 md:py-4 bg-purple-600 text-white rounded-xl md:rounded-2xl font-bold text-base md:text-lg hover:scale-105 active:scale-95 transition-all shadow-xl shadow-purple-500/20 w-full sm:w-auto"
                >
                  <Plus className="w-5 h-5 md:w-6 md:h-6" /> 最初の箱を作成する
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Blocks, Plus, Settings, Hash, LogOut, ArrowRight } from 'lucide-react'

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
     // No hakos owned, redirect to create
     redirect('/owner/hako/create')
  }

  // 2. Fetch the actual Hako details
  const hakoIds = memberships.map(m => m.hako_id)
  const { data: ownedHakos, error: hakosError } = await supabase
    .from('hako')
    .select('id, name, created_at')
    .in('id', hakoIds)
    .order('created_at', { ascending: false })

  if (hakosError || !ownedHakos) {
      redirect('/owner/hako/create')
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans relative overflow-hidden">
      
      {/* Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      {/* Header */}
      <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 glass sticky top-0 z-50">
        <Link href="/owner/dashboard" className="flex items-center gap-2 text-white">
          <Blocks className="w-6 h-6 text-purple-500" />
          <span className="font-bold tracking-tight">Hako Admin</span>
        </Link>

        <form action="/auth/signout" method="post">
           <button type="submit" className="text-sm font-medium text-gray-400 hover:text-white flex items-center gap-2 transition-colors">
               <LogOut className="w-4 h-4" /> ログアウト
           </button>
        </form>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-12 relative z-10 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
                 <h1 className="text-3xl md:text-4xl font-black mb-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
                     マイダッシュボード
                 </h1>
                 <p className="text-gray-400">作成した箱（Hako）の管理と新しい箱を作成できます。</p>
            </div>
            <Link 
              href="/owner/hako/create" 
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-bold hover:scale-105 transition-all shrink-0"
            >
              <Plus className="w-5 h-5" /> 新しい箱を作成
            </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ownedHakos.map((hako: any) => (
                <div key={hako.id} className="glass p-6 rounded-3xl border border-white/5 hover:border-purple-500/30 transition-all group relative overflow-hidden flex flex-col h-full">
                    {/* decorative background glow */}
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] group-hover:bg-purple-500/20 transition-all" />
                    
                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-purple-400 flex items-center justify-center font-bold text-lg border border-white/5 shadow-inner">
                            {hako.name.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <h2 className="text-xl font-bold text-white truncate">{hako.name}</h2>
                            <p className="text-gray-500 text-xs font-mono">{new Date(hako.created_at).toLocaleDateString()}</p>
                        </div>
                    </div>

                    <div className="mt-auto space-y-3 relative z-10 pt-6">
                         <Link 
                            href={`/hako/${hako.id}`} 
                            className="flex items-center justify-between w-full p-3 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-colors group/btn"
                         >
                             <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4 text-gray-400 group-hover/btn:text-white transition-colors" />
                                <span className="text-sm font-medium">箱を開く (アプリ)</span>
                             </div>
                             <ArrowRight className="w-4 h-4 text-gray-500 group-hover/btn:text-white transition-colors group-hover/btn:translate-x-1" />
                         </Link>

                         <Link 
                            href={`/owner/hako/${hako.id}`} 
                            className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-white/5 text-gray-400 hover:text-white transition-colors group/btn"
                         >
                             <div className="flex items-center gap-2">
                                <Settings className="w-4 h-4" />
                                <span className="text-sm">管理画面設定</span>
                             </div>
                         </Link>
                    </div>
                </div>
            ))}
        </div>
      </main>
    </div>
  )
}

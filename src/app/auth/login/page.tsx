'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Blocks, ArrowRight, Loader2, LogIn } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください')
      }

      // Supabase Login
      const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (signInError) throw signInError
      if (!user) throw new Error('ユーザーが見つかりませんでした')

      // Login Routing Logic:
      // 運営サイトのログインは「オーナー」のみ有効。
      // オーナーであれば、箱の一覧画面（/owner/dashboard）へ遷移。
      const { data: memberships, error: membershipError } = await supabase
        .from('hako_members')
        .select('hako_id, role')
        .eq('user_id', user.id)
        .eq('role', 'owner')

      if (membershipError) throw membershipError

      if (!memberships || memberships.length === 0) {
        // Sign them out immediately if they are not an owner
        await supabase.auth.signOut();
        throw new Error('このログインページはオーナー専用です。')
      }

      // オーナーのマイページへ遷移
      router.push('/owner/dashboard')

    } catch (e: any) {
      console.error(e)
      if (e.message.includes('Invalid login credentials')) {
          setErrorMsg('メールアドレスまたはパスワードが間違っています')
      } else {
          setErrorMsg(e.message || 'ログイン中にエラーが発生しました')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] -left-[10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8">
          <Blocks className="w-5 h-5 text-blue-500" />
          <span className="font-bold tracking-tight">トップへ戻る</span>
        </Link>

        <div className="glass-card p-8 rounded-3xl border border-white/10">
          <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 flex items-center gap-3">
             <LogIn className="w-8 h-8 text-blue-400" />
             ログイン
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            作成した箱の管理や、参加している箱のタイムラインへアクセスします。
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="mail@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/50 py-3.5 rounded-xl font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:hover:scale-100"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  認証中...
                </>
              ) : (
                <>
                  ログイン <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center space-y-3">
             <Link href="/auth/owner/signup" className="block text-purple-400 hover:text-purple-300 text-sm transition-colors font-medium">
                 箱のオーナー登録はこちら
             </Link>
          </div>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Blocks, ArrowRight, Loader2, LogIn, ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import { use } from 'react'

export default function HakoLoginPage({ params }: { params: Promise<{ hakoId: string }> }) {
  const { hakoId } = use(params)
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

      // Apply the same alias transformation used during signup
      const aliasedEmail = email.replace('@', `+${hakoId}@`)

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: aliasedEmail,
        password,
      })
      
      if (signInError) throw signInError

      // Redirect back to the hako space
      router.push(`/hako/${hakoId}`)

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
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] -left-[10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Link href={`/hako/${hakoId}/join`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-bold tracking-tight">参加ページへ戻る</span>
        </Link>

        <div className="glass-card p-8 rounded-3xl border border-white/10 shadow-2xl">
          <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400 flex items-center gap-3">
             <LogIn className="w-8 h-8 text-blue-400" />
             ログイン
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            この箱の既存アカウントでログインします。
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
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
        </div>
      </div>
    </main>
  )
}

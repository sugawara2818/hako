'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { Blocks, ArrowRight, Loader2 } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function OwnerSignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const intent = searchParams.get('intent')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      if (!email || !password) {
        throw new Error('メールアドレスとパスワードを入力してください')
      }
      if (password.length < 6) {
        throw new Error('パスワードは6文字以上にしてください')
      }

      // Supabase Signup
      const { data: { user }, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signupError) {
        // If user already exists, try to log them in
        if (signupError.message.includes('already registered')) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (signInError) throw new Error('既に登録されているメールアドレスです。正しいパスワードを入力するかログイン画面からお入りください。')
          
          // Successful login of existing user
          if (intent === 'create') {
            router.push('/owner/hako/create')
          } else {
            router.push('/owner/dashboard')
          }
          return
        }
        throw signupError
      }

      if (!user) throw new Error('ユーザーが作成されませんでした')

      // Ensure profile exists for timeline display
      const { ensureProfile } = await import('@/core/timeline/actions')
      await ensureProfile(user.id, email)

      // 新規登録直後の自動ログイン (意図に基づいて分岐)
      if (intent === 'create') {
        router.push('/owner/hako/create')
      } else {
        router.push('/owner/dashboard')
      }
    } catch (e: any) {
      console.error(e)
      setErrorMsg(e.message || '登録中にエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] bg-purple-600/30 rounded-full blur-[120px] mix-blend-screen" />
        <div className="absolute bottom-[-20%] -left-[10%] w-[50%] h-[50%] bg-pink-600/20 rounded-full blur-[120px] mix-blend-screen" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group">
          <Blocks className="w-5 h-5 text-purple-500 group-hover:scale-110 transition-transform" />
          <span className="font-bold tracking-tight text-sm">トップページに戻る</span>
        </Link>

        <div className="glass-card p-8 rounded-3xl border border-white/10">
          <h1 className="text-3xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
            オーナー登録
          </h1>
          <p className="text-gray-400 text-sm mb-8">
            無料であなただけの箱（アプリ）を作成しましょう。
          </p>

          <form onSubmit={handleSignUp} className="space-y-4">
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
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="owner@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                placeholder="6文字以上"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-black border-2 border-purple-500/50 hover:border-purple-500 text-white py-3.5 rounded-xl font-bold hover:scale-[1.02] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:hover:scale-100 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                  処理中...
                </>
              ) : (
                <>
                  アカウントを作成 <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-white/10 text-center">
            <p className="text-gray-500 text-xs">
              登録することで、利用規約とプライバシーポリシーに同意したことになります。
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { joinHako } from '@/core/hako/actions'
import { ShieldCheck, Check, Loader2, CreditCard, Lock, Sparkles, AlertCircle } from 'lucide-react'
import { use } from 'react'

export default function JoinHakoPage({ params }: { params: Promise<{ hakoId: string }> }) {
  const { hakoId } = use(params)
  const router = useRouter()
  
  const [hakoName, setHakoName] = useState('Loading...')
  const [hakoDescription, setHakoDescription] = useState<string | null>(null)
  const [step, setStep] = useState<'plan' | 'auth' | 'payment' | 'success'>('plan')
  
  // Auth state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  
  // UI state
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'premium'>('premium')

  // Fetch Hako details
  useEffect(() => {
    async function loadHako() {
      const { data } = await supabase.from('hako').select('name, description').eq('id', hakoId).single()
      if (data) {
          setHakoName(data.name)
          setHakoDescription(data.description)
      }
    }
    loadHako()
  }, [hakoId])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setLoading(true)

    try {
      if (!email || !password) throw new Error('入力項目が不足しています')
      
      // Create a unique email alias for this specific Hako to isolate the user
      const aliasedEmail = email.replace('@', `+${hakoId}@`)
      
      const { data, error } = await supabase.auth.signUp({ email: aliasedEmail, password })
      if (error) {
        // Handle case where user might already exist in this Hako
        if (error.message.includes('User already registered') || error.message.includes('already exists')) {
            // Try to sign in instead
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ 
                email: aliasedEmail, 
                password 
            })
            if (signInError) throw new Error('この箱には既にアカウントがあります。正しいパスワードを入力するか、ログイン画面からお入りください。')
            
            // If sign in successful, proceed
            setStep(selectedPlan === 'premium' ? 'payment' : 'success')
            if (selectedPlan === 'free') await processJoin()
            return;
        }
        throw error
      }
      
      if (data.user) {
         // Auto login
         await supabase.auth.signInWithPassword({ email: aliasedEmail, password })
         
         // Create profile with the original clean email for display name
         const { ensureProfile } = await import('@/core/timeline/actions')
         await ensureProfile(data.user.id, email)
      }
      
      // Move to payment if premium, else success
      setStep(selectedPlan === 'premium' ? 'payment' : 'success')
      if (selectedPlan === 'free') {
          await processJoin()
      }
    } catch (e: any) {
      setAuthError(e.message || '登録エラー')
    } finally {
      setLoading(false)
    }
  }

  const handleMockPayment = () => {
    setLoading(true)
    // Simulate payment processing delay
    setTimeout(async () => {
      await processJoin()
      setLoading(false)
    }, 2000)
  }

  const processJoin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')
      
      await joinHako(user.id, hakoId)
      setStep('success')
      
      setTimeout(() => {
        router.push(`/hako/${hakoId}`)
      }, 1500)
    } catch (e) {
      console.error(e)
      alert('参加処理に失敗しました')
      setStep('plan')
    }
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 glass-card p-8 rounded-3xl border border-white/10 animate-fade-in shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              {hakoName}
            </span>
            に参加する
          </h1>
          <p className="text-gray-400 text-sm mb-4">特別なクローズドコミュニティへようこそ</p>
          
          {hakoDescription && (
             <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-gray-300 text-left leading-relaxed animate-fade-in shadow-inner">
                {hakoDescription}
             </div>
          )}
        </div>

        {/* STEP 1: PLAN SELECTION */}
        {step === 'plan' && (
          <div className="space-y-4 animate-fade-in">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              プランを選択
            </h2>
            
            <div 
              onClick={() => setSelectedPlan('free')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between ${
                selectedPlan === 'free' ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'
              }`}
            >
              <div>
                <div className="font-bold">無料メンバー</div>
                <div className="text-sm text-gray-400 mt-1">一部のコンテンツのみ閲覧可能</div>
              </div>
              <div className="text-lg font-bold">¥0</div>
            </div>

            <div 
              onClick={() => setSelectedPlan('premium')}
              className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-center justify-between relative overflow-hidden ${
                selectedPlan === 'premium' ? 'border-pink-500 bg-pink-500/10' : 'border-white/5 bg-white/5 hover:border-white/20'
              }`}
            >
              {selectedPlan === 'premium' && <div className="absolute inset-0 bg-gradient-to-r from-pink-500/10 to-transparent pointer-events-none" />}
              <div className="relative z-10">
                <div className="font-bold flex items-center gap-2">
                  プレミアム会員
                  <span className="text-[10px] bg-pink-500 px-2 py-0.5 rounded-full uppercase font-black">Recommended</span>
                </div>
                <div className="text-sm text-gray-400 mt-1">すべての限定機能とコンテンツにアクセス</div>
              </div>
              <div className="text-lg font-bold relative z-10">¥980<span className="text-xs text-gray-400 font-normal">/月</span></div>
            </div>

            <button 
              onClick={() => setStep('auth')}
              className="w-full mt-6 bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
            >
              次へ進む
            </button>
          </div>
        )}

        {/* STEP 2: AUTH */}
        {step === 'auth' && (
          <form onSubmit={handleAuth} className="space-y-4 animate-fade-in">
             <div className="flex items-center gap-2 mb-6">
                <button type="button" onClick={() => setStep('plan')} className="text-sm text-gray-400 hover:text-white">戻る</button>
                <div className="h-4 w-[1px] bg-white/20" />
                <h2 className="font-semibold text-sm">アカウント情報入力</h2>
             </div>

            {authError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {authError}
              </div>
            )}

            <div>
              <input
                type="email"
                placeholder="メールアドレス"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="パスワード (6文字以上)"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-purple-500 transition-colors"
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-500 text-white py-4 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'アカウントを作成'}
            </button>
            <div className="text-center mt-4 pt-4 border-t border-white/5">
                <Link href={`/hako/${hakoId}/login`} className="text-sm text-gray-500 hover:text-purple-400 transition-colors">
                    既にアカウントをお持ちの方はこちら
                </Link>
            </div>
          </form>
        )}

        {/* STEP 3: MOCK PAYMENT */}
        {step === 'payment' && (
          <div className="space-y-6 animate-fade-in text-center">
             <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
             <h2 className="text-xl font-bold">決済情報の入力</h2>
             <p className="text-sm text-gray-400">
               これはモックUIです。実際の決済は行われません。
             </p>
             
             <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-left">
               <div className="text-sm text-gray-400 mb-1">お支払い金額</div>
               <div className="text-2xl font-bold">¥980 <span className="text-sm text-gray-500 font-normal">/月</span></div>
             </div>

             <button 
              onClick={handleMockPayment}
              disabled={loading}
              className="w-full bg-white text-black py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-black" />
                  処理中...
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  カードで決済する
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 4: SUCCESS */}
        {step === 'success' && (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.3)]">
              <Check className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">参加完了！</h2>
            <p className="text-gray-400">箱へ移動しています...</p>
          </div>
        )}

      </div>
    </div>
  )
}

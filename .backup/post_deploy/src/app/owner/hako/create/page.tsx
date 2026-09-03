'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createHakoForOwner } from '@/core/hako/actions'
import { supabase } from '@/lib/supabase/client'
import { Blocks, Users, Globe, Shield, Loader2, ArrowRight, CheckCircle2, BookOpen, Sparkles, Calendar, Image as ImageIcon, MessageCircle, MessageSquare } from 'lucide-react'
import Link from 'next/link'

const FEATURE_PIECES = [
  { id: 'timeline', label: 'タイムライン', desc: 'Xのようなリアルタイムな投稿機能', icon: Users },
  { id: 'diary', label: '日記', desc: '日々の想いを綴るクローズドな日記帳', icon: BookOpen },
  { id: 'calendar', label: '共有カレンダー', desc: '共有のカレンダーで予定を管理・表示', icon: Calendar },
  { id: 'gallery', label: 'ギャラリー', desc: '思い出の写真を一覧で管理', icon: ImageIcon },
  { id: 'chat', label: 'チャット', desc: 'メンバー同士のリアルタイムな会話', icon: MessageCircle },
  { id: 'bbs', label: '掲示板', desc: 'トピックごとにじっくり会話を楽しむ', icon: MessageSquare },
]

export default function CreateHakoPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [hakoName, setHakoName] = useState('')
  const [hakoDescription, setHakoDescription] = useState('')
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(['timeline'])

  const toggleFeature = (id: string) => {
    setSelectedFeatures(prev => 
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    )
  }

  const handleCreateHako = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('ログイン状態が確認できません')
      }

      // Pass selectedFeatures and hakoName to backend
      const hako = await createHakoForOwner(user.id, hakoName, hakoDescription, selectedFeatures)
      
      router.push(`/owner/hako/${hako.id}`)
    } catch (e: any) {
      console.error(e)
      alert('箱の作成に失敗しました: ' + (e.message || 'unknown error'))
      setLoading(false)
    }
  }


  return (
    <div className="min-h-screen theme-bg theme-text p-6 font-sans transition-colors duration-300">
      {/* Top Nav */}
      <header className="flex items-center justify-between max-w-5xl mx-auto py-4 md:py-6 mb-8 md:mb-12">
        <div className="flex items-center gap-4 md:gap-8">
            <Link href="/owner/dashboard" className="flex items-center gap-2 theme-muted hover:theme-text transition-colors group">
              <Blocks className="w-6 h-6 text-purple-500 transition-transform group-hover:scale-110" />
              <span className="text-lg md:text-xl font-bold">hako</span>
            </Link>
            <div className="h-6 w-[1px] theme-border hidden sm:block" />
            <Link href="/owner/dashboard" className="hidden sm:flex items-center gap-2 text-sm theme-muted hover:theme-text transition-colors">
                 ダッシュボードへ戻る
            </Link>
        </div>
        <div className="text-[10px] md:text-sm theme-muted theme-elevated px-3 py-1 rounded-full border theme-border">Step 1 of 2: Create Space</div>
      </header>

      <main className="max-w-3xl mx-auto animate-fade-in relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4">世界を構築する</h1>
          <p className="text-gray-400 text-lg">
            あなただけのクローズドSNSの土台を作りましょう。<br />
            必要な機能ピースを選択してください。
          </p>
        </div>

        <form onSubmit={handleCreateHako} className="space-y-12">
          
          {/* Hako Name */}
          <div className="glass-card p-8 rounded-3xl theme-border space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm">1</span>
              箱の名前
            </h2>
            <input
              type="text"
              value={hakoName}
              onChange={e => setHakoName(e.target.value)}
              placeholder="例: My Secret Community"
              className="w-full theme-elevated border theme-border rounded-xl px-4 py-4 text-xl theme-text placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium"
              required
            />
          </div>

          <div className="glass-card p-8 rounded-3xl theme-border space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm">2</span>
                箱の紹介文
              </h2>
            </div>
            <textarea
              value={hakoDescription}
              onChange={e => setHakoDescription(e.target.value)}
              placeholder="箱の目的や、どんなユーザーに参加してほしいかを書きましょう"
              rows={4}
              className="w-full theme-elevated border theme-border rounded-xl px-4 py-4 text-lg theme-text placeholder:text-gray-400 dark:placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none"
            />
          </div>

          {/* Feature Selection */}
          <div className="glass-card p-8 rounded-3xl theme-border space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center text-sm">3</span>
                機能ピースを選択
              </h2>
              <span className="text-sm text-gray-500">※後から追加・削除可能です</span>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {FEATURE_PIECES.map(feature => {
                const isSelected = selectedFeatures.includes(feature.id)
                return (
                  <button
                    key={feature.id}
                    type="button"
                    onClick={() => toggleFeature(feature.id)}
                    className={`p-6 rounded-2xl text-left border overflow-hidden relative transition-all duration-300 ${
                      isSelected 
                        ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.15)] shadow-purple-500/20 scale-[1.02]' 
                        : 'theme-elevated theme-border hover:theme-muted/5'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-4 right-4 text-purple-400 animate-fade-in">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                      isSelected ? 'bg-purple-500 text-white' : 'glass text-gray-400'
                    }`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <h3 className={`font-bold text-lg mb-1 ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                      {feature.label}
                    </h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                      {feature.desc}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Action */}
          <div className="flex justify-center md:justify-end pt-4 pb-12">
            <button
              type="submit"
              disabled={loading || !hakoName}
              className="w-full md:w-auto px-10 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_40px_rgba(168,85,247,0.4)]"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  この構成で箱を作る <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>
      </main>
      
      {/* Background Decor */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none -z-10" />
    </div>
  )
}

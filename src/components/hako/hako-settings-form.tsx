'use client'

import { useState, useRef } from 'react'
import { Camera, Loader2, Check, AlertCircle, Trash2, AlertTriangle, BookOpen, Hash } from 'lucide-react'
import { updateHako, deleteHako } from '@/core/hako/actions'
import { uploadPostImage } from '@/core/timeline/upload'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface HakoSettingsFormProps {
  hakoId: string
  initialName: string
  initialIconUrl: string | null
  initialIconColor: string | null
  initialFeatures: string[]
}

const FEATURE_PIECES = [
  { id: 'timeline', label: 'タイムライン', desc: 'Xのようなリアルタイムな投稿機能', icon: Hash }, 
  { id: 'diary', label: '日記', desc: '日々の想いを綴るクローズドな日記帳', icon: BookOpen },
]

const PRESET_GRADIENTS = [
  { id: 'purple', class: 'from-purple-500 to-pink-500' },
  { id: 'blue', class: 'from-blue-500 to-cyan-500' },
  { id: 'emerald', class: 'from-emerald-500 to-teal-500' },
  { id: 'orange', class: 'from-orange-500 to-yellow-500' },
  { id: 'red', class: 'from-red-600 to-orange-500' },
  { id: 'indigo', class: 'from-indigo-500 to-purple-500' },
  { id: 'black', class: 'from-gray-700 to-gray-900' },
]

export function HakoSettingsForm({ hakoId, initialName, initialIconUrl, initialIconColor, initialFeatures }: HakoSettingsFormProps) {
  const [name, setName] = useState(initialName)
  const [iconUrl, setIconUrl] = useState(initialIconUrl)
  const [iconColor, setIconColor] = useState(initialIconColor || 'purple')
  const [iconType, setIconType] = useState<'image' | 'template'>(initialIconUrl ? 'image' : 'template')
  const [features, setFeatures] = useState<string[]>(initialFeatures || ['timeline'])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmName, setDeleteConfirmName] = useState('')
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('画像サイズは5MB以下にしてください')
      return
    }

    setIsUploading(true)
    setError(null)
    setSuccess(false)

    try {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadPostImage(formData)

      if (result.success && result.url) {
        setIconUrl(result.url)
        setIconType('image')
      } else {
        throw new Error(result.error || '画像のアップロードに失敗しました')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const result = await updateHako(hakoId, { 
        name: name.trim(), 
        icon_url: iconType === 'image' ? iconUrl : null,
        icon_color: iconType === 'template' ? iconColor : null,
        features: features
      })

      if (result.success) {
        setSuccess(true)
        router.refresh()
      } else {
         throw new Error('設定の更新に失敗しました')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (deleteConfirmName !== initialName || isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await deleteHako(hakoId)
      if (result.success) {
        router.push('/owner/dashboard')
      } else {
        throw new Error('箱の削除に失敗しました')
      }
    } catch (err: any) {
      setError(err.message)
      setIsSubmitting(false)
    }
  }

  const currentGradient = PRESET_GRADIENTS.find(g => g.id === iconColor)?.class || PRESET_GRADIENTS[0].class

  return (
    <div className="space-y-12">
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="relative group">
            <div className={`w-28 h-28 rounded-[2rem] flex items-center justify-center font-bold text-4xl overflow-hidden shadow-2xl border-4 border-white/10 group-hover:border-purple-500/50 transition-all duration-300 ${iconType === 'template' ? `bg-gradient-to-br ${currentGradient}` : 'bg-black'}`}>
              {iconType === 'image' && iconUrl ? (
                <Image 
                  src={iconUrl} 
                  alt="Hako Icon" 
                  width={112} 
                  height={112} 
                  className="w-full h-full object-cover" 
                  unoptimized={iconUrl.startsWith('data:') || iconUrl.startsWith('blob:')}
                />
              ) : (
                <span className="text-white drop-shadow-md">{name.charAt(0).toUpperCase()}</span>
              )}
              
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                </div>
              )}
            </div>
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 p-3 rounded-2xl bg-white text-black shadow-xl hover:bg-gray-100 hover:scale-110 active:scale(0.95) transition-all z-10"
              disabled={isUploading}
              title="画像をアップロード"
            >
              <Camera className="w-4 h-4" />
            </button>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleIconUpload}
            />
          </div>

          <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 w-full max-w-xs">
            <button
              type="button"
              onClick={() => setIconType('template')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${iconType === 'template' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              カラーテンプレ
            </button>
            <button
              type="button"
              onClick={() => {
                  if (iconUrl) setIconType('image')
                  else fileInputRef.current?.click()
              }}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${iconType === 'image' ? 'bg-white/10 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
            >
              写真
            </button>
          </div>
        </div>

        {iconType === 'template' && (
          <div className="space-y-4 animate-in fade-in duration-300">
             <label className="text-sm font-bold text-gray-400 ml-1">色を選択</label>
             <div className="grid grid-cols-4 sm:grid-cols-7 gap-3">
               {PRESET_GRADIENTS.map((g) => (
                 <button
                   key={g.id}
                   type="button"
                   onClick={() => setIconColor(g.id)}
                   className={`w-full aspect-square rounded-2xl bg-gradient-to-br ${g.class} border-2 transition-all p-0.5 ${iconColor === g.id ? 'border-white scale-110 shadow-lg shadow-white/20' : 'border-transparent hover:scale(105)'}`}
                 >
                   {iconColor === g.id && (
                     <div className="w-full h-full flex items-center justify-center">
                       <Check className="w-5 h-5 text-white" />
                     </div>
                   )}
                 </button>
               ))}
             </div>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-bold text-gray-400 ml-1">箱の名前</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full glass border border-white/10 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-purple-500/50 focus:bg-white/5 transition-all shadow-inner"
            placeholder="箱の名前を入力"
            maxLength={50}
            required
          />
        </div>

        <div className="space-y-4">
          <label className="text-sm font-bold text-gray-400 ml-1">機能ピースの管理</label>
          <div className="grid grid-cols-1 gap-3">
            {FEATURE_PIECES.map(piece => {
              const isEnabled = features.includes(piece.id)
              return (
                <button
                  key={piece.id}
                  type="button"
                  onClick={() => {
                    setFeatures(prev => 
                      prev.includes(piece.id) ? prev.filter(f => f !== piece.id) : [...prev, piece.id]
                    )
                  }}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isEnabled ? 'bg-purple-500/10 border-purple-500/50 text-white' : 'bg-black/40 border-white/5 text-gray-500 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-3">
                    <piece.icon className="w-5 h-5" />
                    <span className="font-bold">{piece.label}</span>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isEnabled ? 'bg-purple-500' : 'bg-gray-800'}`}>
                    <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isEnabled ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm animate-in fade-in slide-in-from-top-1">
            <Check className="w-4 h-4 shrink-0" />
            設定を保存しました
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || isUploading}
          className="w-full py-5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-[1.5rem] font-black shadow-xl shadow-purple-900/40 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 text-lg"
        >
          {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <Check className="w-6 h-6" />}
          設定を保存する
        </button>
      </form>

      {/* Danger Zone */}
      <div className="pt-8 border-t border-white/5 space-y-6">
        <div className="flex items-center gap-2 text-red-500 mb-2">
          <Trash2 className="w-5 h-5" />
          <h3 className="font-black text-xl">Danger Zone</h3>
        </div>
        
        {!showDeleteConfirm ? (
          <div className="glass border border-red-500/20 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:bg-red-500/[0.02]">
            <div>
              <h4 className="font-bold text-white mb-1">この箱を削除する</h4>
              <p className="text-gray-500 text-sm">箱と投稿データ、すべてのメンバー情報は完全に削除されます。この操作は取り消せません。</p>
            </div>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-6 py-3 border border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white rounded-xl font-bold transition-all text-sm shrink-0"
            >
              箱を削除
            </button>
          </div>
        ) : (
          <div className="glass border border-red-500/50 p-6 rounded-3xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 text-red-400 bg-red-500/10 p-4 rounded-2xl border border-red-500/20">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-black mb-1 text-red-300">本当に削除しますか？</p>
                <p>箱の名前「<span className="font-bold text-white">{initialName}</span>」を入力して確定してください。</p>
              </div>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="w-full glass border border-red-500/20 rounded-2xl px-5 py-4 text-white focus:outline-none focus:border-red-500 transition-all"
                placeholder="箱の名前を入力"
              />
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false)
                    setDeleteConfirmName('')
                  }}
                  className="flex-1 py-3 text-gray-400 font-bold hover:text-white transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteConfirmName !== initialName || isSubmitting}
                  className="flex-[2] py-3 bg-red-600 hover:bg-red-500 disabled:opacity-30 disabled:grayscale text-white rounded-xl font-black transition-all shadow-lg shadow-red-900/40"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : '削除を確定する'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

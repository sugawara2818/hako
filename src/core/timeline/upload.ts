'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function uploadPostImage(formData: FormData): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('ログインが必要です')

  const file = formData.get('file') as File
  if (!file || file.size === 0) throw new Error('ファイルが見つかりません')
  if (file.size > 10 * 1024 * 1024) throw new Error('画像は10MB以下にしてください')

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic']
  if (!allowed.includes(ext)) throw new Error('対応画像形式: JPG, PNG, GIF, WebP')

  const fileName = `${user.id}/${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('post-images')
    .upload(fileName, file, { contentType: file.type, upsert: false })

  // Wrap StorageError into a plain Error for Next.js serialization
  if (uploadError) {
    throw new Error(
      uploadError.message?.includes('Bucket not found')
        ? 'ストレージが設定されていません。管理者に連絡してください。'
        : `アップロードに失敗しました: ${uploadError.message}`
    )
  }

  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(fileName)

  return publicUrl
}

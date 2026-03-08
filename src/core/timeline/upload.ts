'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function uploadPostImage(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'ログインが必要です' }

    const file = formData.get('file') as File
    if (!file || file.size === 0) return { success: false, error: 'ファイルが見つかりません' }
    if (file.size > 10 * 1024 * 1024) return { success: false, error: '画像は10MB以下にしてください' }

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const allowed = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    if (!allowed.includes(ext)) return { success: false, error: '対応形式: JPG, PNG, GIF, WebP' }

    const fileName = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('post-images')
      .upload(fileName, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error('Upload Error:', uploadError)
      return { 
        success: false, 
        error: uploadError.message === 'Bucket not found' 
          ? 'ストレージ(post-images)が作成されていません' 
          : `アップロード失敗: ${uploadError.message}` 
      }
    }

    const { data: { publicUrl } } = supabase.storage
      .from('post-images')
      .getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (e: any) {
    console.error('Unexpected Upload Error:', e)
    return { success: false, error: '予期せぬエラーが発生しました' }
  }
}

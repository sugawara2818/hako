'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

// Upload an image to Supabase Storage and return its public URL
export async function uploadPostImage(formData: FormData): Promise<string> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const file = formData.get('file') as File
  if (!file) throw new Error('No file provided')

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) throw new Error('ファイルサイズが大きすぎます（最大10MB）')

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('post-images')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabase.storage
    .from('post-images')
    .getPublicUrl(fileName)

  return publicUrl
}

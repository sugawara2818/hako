'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getGalleryImages(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('hako_timeline_posts')
    .select(`
      id,
      image_urls,
      created_at,
      user_id,
      profiles:user_id (display_name, avatar_url)
    `)
    .eq('hako_id', hakoId)
    .not('image_urls', 'is', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('getGalleryImages Error:', error)
    return []
  }

  // Filter posts that have images and flatten
  const images = (data || [])
    .filter(post => post.image_urls && post.image_urls.length > 0)
    .flatMap(post => {
      const memberInfo = (post.profiles as any) || {}
      return post.image_urls.map((url: string) => ({
        id: `${post.id}-${url}`,
        postId: post.id,
        url,
        createdAt: post.created_at,
        userName: memberInfo.display_name || 'ユーザー',
        userAvatar: memberInfo.avatar_url
      }))
    })

  return images
}

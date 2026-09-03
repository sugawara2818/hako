'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface BbsThread {
  id: string
  hako_id: string
  title: string
  description: string | null
  created_by: string | null
  created_at: string
  last_post_at: string
  post_count: number
  is_pinned: boolean
}

export interface BbsPost {
  id: string
  thread_id: string
  hako_id: string
  content: string
  user_id: string | null
  user_name: string | null
  created_at: string
  post_number: number
}

// スレッド一覧取得
export async function getBbsThreads(hakoId: string) {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('bbs_threads')
    .select('*')
    .eq('hako_id', hakoId)
    .order('is_pinned', { ascending: false })
    .order('last_post_at', { ascending: false })

  if (error) throw error
  return data as BbsThread[]
}

// 1つのスレッドと投稿一覧取得
export async function getBbsThread(threadId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: thread, error: tError } = await supabase
    .from('bbs_threads')
    .select('*')
    .eq('id', threadId)
    .single()

  if (tError) throw tError

  const { data: posts, error: pError } = await supabase
    .from('bbs_posts')
    .select('*')
    .eq('thread_id', threadId)
    .order('post_number', { ascending: true })

  if (pError) throw pError

  return { thread: thread as BbsThread, posts: posts as BbsPost[] }
}

// スレッド作成 (最初の1件目の書き込みも同時)
export async function createBbsThread(hakoId: string, title: string, content: string, userName?: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // スレッド作成
  const { data: thread, error: tError } = await supabase
    .from('bbs_threads')
    .insert({
      hako_id: hakoId,
      title: title.trim(),
      created_by: user.id,
      post_count: 1
    })
    .select()
    .single()

  if (tError) throw tError

  // 1件目の投稿を作成
  const { error: pError } = await supabase
    .from('bbs_posts')
    .insert({
      thread_id: thread.id,
      hako_id: hakoId,
      content: content.trim(),
      user_id: user.id,
      user_name: userName?.trim() || '名無しさん',
      post_number: 1
    })

  if (pError) throw pError

  revalidatePath(`/hako/${hakoId}/bbs`)
  return thread as BbsThread
}

// 返信投稿
export async function createBbsPost(threadId: string, content: string, userName?: string) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  // スレッド情報の取得
  const { data: thread, error: tFetchError } = await supabase
    .from('bbs_threads')
    .select('hako_id, post_count')
    .eq('id', threadId)
    .single()
  
  if (tFetchError) throw tFetchError

  const nextPostNumber = (thread.post_count || 0) + 1

  // 投稿作成
  const { data: post, error: pError } = await supabase
    .from('bbs_posts')
    .insert({
      thread_id: threadId,
      hako_id: thread.hako_id,
      content: content.trim(),
      user_id: user.id,
      user_name: userName?.trim() || '名無しさん',
      post_number: nextPostNumber
    })
    .select()
    .single()

  if (pError) throw pError

  // スレッドの更新 (更新日時、投稿数)
  const { error: tUpdateError } = await supabase
    .from('bbs_threads')
    .update({
      last_post_at: new Date().toISOString(),
      post_count: nextPostNumber
    })
    .eq('id', threadId)

  if (tUpdateError) throw tUpdateError

  revalidatePath(`/hako/${thread.hako_id}/bbs`)
  revalidatePath(`/hako/${thread.hako_id}/bbs/${threadId}`)
  
  return post as BbsPost
}

// スレッド削除 (オーナー用)
export async function deleteBbsThread(threadId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: thread } = await supabase.from('bbs_threads').select('hako_id').eq('id', threadId).single()
  
  const { error } = await supabase
    .from('bbs_threads')
    .delete()
    .eq('id', threadId)

  if (error) throw error
  
  if (thread) revalidatePath(`/hako/${thread.hako_id}/bbs`)
  return { success: true }
}

// 投稿削除 (オーナー用)
export async function deleteBbsPost(postId: string) {
  const supabase = await createServerSupabaseClient()
  
  const { data: post } = await supabase.from('bbs_posts').select('thread_id, hako_id').eq('id', postId).single()
  
  const { error } = await supabase
    .from('bbs_posts')
    .delete()
    .eq('id', postId)

  if (error) throw error
  
  if (post) {
    revalidatePath(`/hako/${post.hako_id}/bbs`)
    revalidatePath(`/hako/${post.hako_id}/bbs/${post.thread_id}`)
  }
  return { success: true }
}

// src/core/hako/createHako.ts
import { supabase } from '@/lib/supabase/client'

export async function createHako(userId: string) {
  const { data: hako, error } = await supabase
    .from('hako')
    .insert({ name: `Hako-${Math.floor(Math.random() * 1000)}`, owner_id: userId })
    .select('*')
    .single()

  if (error || !hako) throw new Error(error?.message || 'hako作成失敗')

  const { error: memberError } = await supabase.from('hako_members').insert({
    hako_id: hako.id,
    user_id: userId,
    role: 'owner',
  })

  if (memberError) throw new Error(memberError.message)

  return hako
}
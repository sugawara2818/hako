import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ hakoId: string }> }
) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  // Fetch hako data to get the name
  const { data: hako } = await supabase
    .from('hako')
    .select('name')
    .eq('id', hakoId)
    .single()

  const hakoName = hako?.name || 'Hako'

  const manifest = {
    name: `${hakoName} - Hako`,
    short_name: hakoName,
    description: `Private space: ${hakoName}`,
    start_url: `/hako/${hakoId}`,
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  }

  return NextResponse.json(manifest)
}

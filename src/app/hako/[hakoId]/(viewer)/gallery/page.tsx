import { createServerSupabaseClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { getGalleryImages } from '@/core/gallery/actions'
import { GalleryGrid } from '@/components/gallery/GalleryGrid'

export const dynamic = 'force-dynamic'

export default async function GalleryPage({ params }: { params: Promise<{ hakoId: string }> }) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()

  // 1. Auth check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/hako/${hakoId}/login`)

  // 2. Fetch hako and member info
  const [{ data: hako }, { data: member }] = await Promise.all([
    supabase.from('hako').select('*').eq('id', hakoId).single(),
    supabase.from('hako_members').select('*').eq('hako_id', hakoId).eq('user_id', user.id).maybeSingle()
  ])

  if (!hako || !member) return notFound()

  // 3. Feature check
  const features = hako.features || ['timeline']
  if (!features.includes('gallery')) {
    return redirect(`/hako/${hakoId}`)
  }

  // 4. Fetch images
  const images = await getGalleryImages(hakoId)

  return (
    <div className="flex-1 overflow-y-auto w-full mx-auto hide-scrollbar">
      {/* Header */}
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8 animate-fade-in border-x border-b theme-border theme-bg">
        <h1 className="text-xl md:text-2xl font-black heading-gradient">
          共有ギャラリー
        </h1>
        <p className="text-xs theme-muted mt-1 uppercase tracking-widest font-black">
          {images.length} 個のアイテム
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <GalleryGrid images={images} />
      </div>
    </div>
  )
}

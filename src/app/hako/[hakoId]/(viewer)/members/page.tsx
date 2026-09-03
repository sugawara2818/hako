import { createServerSupabaseClient } from '@/lib/supabase/server'
import { fetchHakoMembers } from '@/core/hako/actions'
import { Users, ShieldAlert, AtSign, Calendar, ChevronRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function HakoMembersPage({
  params
}: {
  params: Promise<{ hakoId: string }>
}) {
  const { hakoId } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch hako data to verify it exists
  const { data: hako } = await supabase
    .from('hako')
    .select('name')
    .eq('id', hakoId)
    .single()

  if (!hako) return notFound()

  const members = await fetchHakoMembers(hakoId)

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <header className="h-16 flex items-center px-4 gap-4 sticky top-0 z-10 theme-surface border-b theme-border backdrop-blur-xl shrink-0">
        <Users className="w-6 h-6 text-orange-400" />
        <h1 className="text-xl font-black theme-text tracking-tight">メンバー</h1>
        <div className="ml-auto bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-orange-400/20">
          {members.length} MEMBERS
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 no-scrollbar">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="grid gap-3">
            {members.map((member) => (
              <Link 
                key={member.user_id}
                href={`/hako/${hakoId}/user/${member.user_id}`}
                className="group flex items-center gap-4 p-4 rounded-3xl theme-elevated border theme-border hover:theme-surface transition-all animate-fade-in"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className="w-14 h-14 rounded-full overflow-hidden border-2 theme-border group-hover:scale-105 transition-transform shadow-lg shadow-black/20">
                    {member.avatar_url ? (
                      <Image 
                        src={member.avatar_url} 
                        alt={member.display_name || ''} 
                        width={56} 
                        height={56} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center font-bold text-gray-400 text-lg uppercase">
                        {member.display_name?.charAt(0) || '?'}
                      </div>
                    )}
                  </div>
                  {member.role === 'owner' && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white border-2 theme-border shadow-md">
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>

                {/* Name & Role */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold theme-text text-base truncate group-hover:underline">
                      {member.display_name || 'ユーザー'}
                    </span>
                    {member.user_id === user.id && (
                      <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full border border-blue-400/20 uppercase tracking-widest">YOU</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-gray-500">
                    <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${member.role === 'owner' ? 'text-orange-400/80' : 'text-blue-400/80'}`}>
                      {member.role === 'owner' ? <ShieldAlert className="w-2.5 h-2.5" /> : <AtSign className="w-2.5 h-2.5" />}
                      {member.role}
                    </div>
                    {member.joined_at && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500 font-medium">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(member.joined_at).toLocaleDateString('ja-JP')}
                      </div>
                    )}
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
          
          {/* Footer note */}
          <p className="text-center text-[10px] font-medium text-gray-600 uppercase tracking-widest pt-8">
            &copy; {new Date().getFullYear()} Hako Collaboration Space
          </p>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getChatMessages, sendChatMessage, getChatChannels, createChatChannel, deleteChatChannel, markChannelAsRead, togglePinChannel, getChannelMembers, updateChannelName, addChannelMembers } from '@/core/chat/actions'
import { Hash, Send, Loader2, Menu, Trash2, Users, MessageCircle, ChevronLeft, Settings, X, Shield, Pin, Edit2, UserPlus, Check, Search } from 'lucide-react'
import Image from 'next/image'
import { ChannelSidebar } from './ChannelSidebar'

interface ChatMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  userName: string
  userAvatar: string | null
  channel_id: string
}

interface ChatChannel {
  id: string
  name: string
  description: string | null
  type?: 'public' | 'private'
  created_by?: string
  last_message_content?: string | null
  last_message_at?: string | null
  unreadCount?: number
  is_pinned?: boolean
}

interface Member {
  user_id: string
  display_name: string | null
  avatar_url: string | null
}

interface ChatViewProps {
  hakoId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  isOwner: boolean
  initialChannels: any[]
  initialChannelId?: string
}

import { useSearchParams, useRouter } from 'next/navigation'

export function ChatView({ hakoId, currentUserId, currentUserName, currentUserAvatar, isOwner, initialChannels, initialChannelId }: ChatViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlChannelId = searchParams.get('c')
  
  const [channels, setChannels] = useState<ChatChannel[]>(initialChannels)
  const [members, setMembers] = useState<Member[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(urlChannelId || initialChannelId || null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isChannelsLoading, setIsChannelsLoading] = useState(false)
  const [hiddenChannels, setHiddenChannels] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem(`hidden_channels_${hakoId}_${currentUserId}`) || '[]')
      } catch (e) { return [] }
    }
    return []
  })
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [channelMembers, setChannelMembers] = useState<any[]>([])
  const [isSettingsLoading, setIsSettingsLoading] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [editName, setEditName] = useState('')
  const [showInvite, setShowInvite] = useState(false)
  const [memberSearch, setMemberSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([])

  // 1. Fetch Members
  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('hako_members')
        .select('user_id, display_name, avatar_url')
        .eq('hako_id', hakoId)
      setMembers(data || [])
    }
    fetchMembers()
  }, [hakoId])

  // 2. Fetch Channels and Setup Channel Subscription
  useEffect(() => {
    // Initial channels are already loaded via props

    const channel = supabase
      .channel(`channels:${hakoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channels',
          filter: `hako_id=eq.${hakoId}`,
        },
        async () => {
          const updatedChannels = await getChatChannels(hakoId)
          setChannels(updatedChannels)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channel_members',
          filter: `user_id=eq.${currentUserId}`,
        },
        async () => {
          const updatedChannels = await getChatChannels(hakoId)
          setChannels(updatedChannels)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hakoId, currentUserId])

  // 3. Fetch Messages and Setup Message Subscription
  useEffect(() => {
    if (!activeChannelId) return

    const fetchInitialMessages = async () => {
      setIsMessagesLoading(true)
      const { messages: msgs, members: channelMembersData } = await getChatMessages(hakoId, activeChannelId)
      setMessages(msgs)
      setChannelMembers(channelMembersData)
      setIsMessagesLoading(false)
      scrollToBottom()
    }

    fetchInitialMessages()
    
    // Mark as read when entering channel
    markChannelAsRead(hakoId, activeChannelId)
    // Instantly clear the local badge
    setChannels(prev => prev.map(c => c.id === activeChannelId ? { ...c, unreadCount: 0 } : c))

    const channel = supabase
      .channel(`messages:${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `channel_id=eq.${activeChannelId}`,
        },
        async (payload: any) => {
          const newMessage = payload.new
          const isMe = newMessage.user_id === currentUserId
          
          // Mark as read if we are looking at this channel
          markChannelAsRead(hakoId, activeChannelId)

          let displayMsg: ChatMessage;
          if (isMe) {
            displayMsg = {
              id: newMessage.id,
              content: newMessage.content,
              created_at: newMessage.created_at,
              user_id: newMessage.user_id,
              userName: currentUserName,
              userAvatar: currentUserAvatar,
              channel_id: newMessage.channel_id
            }
          } else {
            const member = members.find(m => m.user_id === newMessage.user_id)
            displayMsg = {
                id: newMessage.id,
                content: newMessage.content,
                created_at: newMessage.created_at,
                user_id: newMessage.user_id,
                userName: member?.display_name || 'ユーザー',
                userAvatar: member?.avatar_url || null,
                channel_id: newMessage.channel_id
            }
          }

          setMessages((prev) => {
            if (prev.some(m => m.id === displayMsg.id)) return prev
            return [...prev, displayMsg]
          })
          scrollToBottom()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hakoId, activeChannelId, currentUserId, currentUserName, currentUserAvatar, members])

  // 4. Listen for Read Status Updates ONLY (initial members come from getChatMessages)
  useEffect(() => {
    if (!activeChannelId) {
      setChannelMembers([])
      return
    }

    // Real-time subscription for member read updates
    const channel = supabase
      .channel(`active_members:${activeChannelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_channel_members',
          filter: `channel_id=eq.${activeChannelId}`,
        },
        async () => {
          // We still need to fetch members occasionally if they update their profiles or read status
          const m = await getChannelMembers(hakoId, activeChannelId)
          setChannelMembers(m)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hakoId, activeChannelId])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending || !activeChannelId) return

    const messageContent = inputText.trim()
    setInputText('')
    setIsSending(true)

    // Optimistically update the channel list sorting
    const now = new Date().toISOString()
    setChannels(prev => {
      const updated = prev.map(c => c.id === activeChannelId 
        ? { ...c, last_message_content: messageContent, last_message_at: now } 
        : c)
      return updated.sort((a, b) => {
        const aPinned = a.is_pinned ? 1 : 0
        const bPinned = b.is_pinned ? 1 : 0
        if (aPinned !== bPinned) return bPinned - aPinned
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0
        return bTime - aTime
      })
    })

    try {
      const result = await sendChatMessage(hakoId, activeChannelId, messageContent)
      if (!result.success) {
        alert(result.error)
        setInputText(messageContent)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setInputText(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  const handleCreateChannel = async (name: string, description: string, type: 'public' | 'private', memberIds: string[]) => {
    const res = await createChatChannel(hakoId, name, description, type, memberIds)
    if (res.success) {
      setChannels(prev => [res.data, ...prev])
      setActiveChannelId(res.data.id)
    } else {
      alert(res.error)
    }
  }

  const handleHideChannel = (channelId: string) => {
    setHiddenChannels(prev => {
      const next = [...prev, channelId]
      localStorage.setItem(`hidden_channels_${hakoId}_${currentUserId}`, JSON.stringify(next))
      return next
    })
    if (activeChannelId === channelId) {
      setActiveChannelId(null)
    }
  }

  const handleRestoreHiddenChannels = () => {
    setHiddenChannels([])
    localStorage.removeItem(`hidden_channels_${hakoId}_${currentUserId}`)
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('本当に削除しますか？すべてのメッセージとメンバー履歴が消えます。')) return
    const res = await deleteChatChannel(hakoId, channelId)
    if (res.success) {
      setShowSettings(false)
      setChannels(prev => {
        const remaining = prev.filter(c => c.id !== channelId)
        if (activeChannelId === channelId) {
          setActiveChannelId(remaining[0]?.id || null)
        }
        return remaining
      })
    } else {
      alert(res.error)
    }
  }
  const handlePinToggle = async (channelId: string, isPinned: boolean) => {
    const res = await togglePinChannel(hakoId, channelId, isPinned)
    if (res.success) {
      setChannels(prev => prev.map(c => 
        c.id === channelId ? { ...c, is_pinned: isPinned } : c
      ).sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1
        if (!a.is_pinned && b.is_pinned) return 1
        return 0 
      }))
    } else {
      alert(res.error)
    }
  }

  const activeChannel = channels.find(c => c.id === activeChannelId)

  if (isChannelsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary/50" />
        <p className="text-xs font-black theme-muted uppercase tracking-widest">チャンネルを読み込み中...</p>
      </div>
    )
  }

  const visibleChannels = channels.filter(c => !hiddenChannels.includes(c.id))

  return (
    <div className="flex-1 flex overflow-hidden theme-bg">
      {/* 1. Channel List (Home View) */}
      {!activeChannelId ? (
        <div className="flex-1 flex flex-col min-w-0 h-full">
           <ChannelSidebar 
            channels={visibleChannels}
            members={members}
            currentUserId={currentUserId}
            activeChannelId=""
            onChannelSelect={(id) => {
              setActiveChannelId(id)
            }}
            onCreateChannel={handleCreateChannel}
            onHideChannel={handleHideChannel}
            onRestoreHiddenChannels={handleRestoreHiddenChannels}
            onPinToggle={handlePinToggle}
            isOwner={isOwner}
          />
        </div>
      ) : (
        <>
          {/* 2. Sidebar - Desktop (Only shown on very large screens if preferred, but here we go full chat) */}
          <div className="hidden lg:block w-80 border-r theme-border shrink-0">
            <ChannelSidebar 
              channels={visibleChannels}
              members={members}
              currentUserId={currentUserId}
              activeChannelId={activeChannelId || ""}
              onChannelSelect={(id) => {
                setActiveChannelId(id)
                router.push(`/hako/${hakoId}/chat?c=${id}`)
              }}
              onCreateChannel={handleCreateChannel}
              onHideChannel={handleHideChannel}
              onRestoreHiddenChannels={handleRestoreHiddenChannels}
              onPinToggle={handlePinToggle}
              isOwner={isOwner}
            />
          </div>

          {/* 3. Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            {/* Unified Header */}
            <div className="h-14 border-b theme-border flex items-center px-4 md:px-6 bg-white/5 backdrop-blur-md justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => {
                    setActiveChannelId(null)
                    router.push(`/hako/${hakoId}/chat`)
                  }}
                  className="p-2 -ml-2 theme-muted hover:theme-text transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 min-w-0 text-[#06C755]">
                  {activeChannel?.type === 'private' ? (
                    <Users className="w-4 h-4 shrink-0 opacity-50" />
                  ) : (
                    <Hash className="w-4 h-4 shrink-0 opacity-50" />
                  )}
                  <h1 className="font-bold text-sm md:text-base truncate theme-text">
                    {activeChannel?.name || 'チャット'}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    if (!activeChannelId) return
                    setIsSettingsLoading(true)
                    setShowSettings(true)
                    setEditName(activeChannel?.name || '')
                    setIsEditingName(false)
                    setShowInvite(false)
                    setSelectedMemberIds([])
                    setMemberSearch('')
                    const m = await getChannelMembers(hakoId, activeChannelId)
                    setChannelMembers(m)
                    setIsSettingsLoading(false)
                  }}
                  className="p-2 theme-muted hover:theme-text transition-colors"
                  title="チャンネル設定"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth hide-scrollbar transition-all"
        >
          {isMessagesLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-[#06C755]/50" />
              <p className="text-xs font-black theme-muted uppercase tracking-widest">メッセージを読み込み中...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                 <MessageCircle className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold">まだメッセージはありません</p>
              <p className="text-xs mt-1">最初のメッセージを送ってみましょう</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.user_id === currentUserId
              return (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                >
                  {/* Avatar */}
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-white/5 shrink-0 border theme-border">
                    {msg.userAvatar ? (
                      <Image src={msg.userAvatar} alt="" width={32} height={32} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-primary/20 text-brand-primary font-black text-xs">
                        {msg.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Content Bubble */}
                  <div className={`flex flex-col max-w-[75%] gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    {!isMe && (
                      <span className="text-[10px] font-black theme-muted uppercase tracking-widest px-1">
                        {msg.userName}
                      </span>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-[15px] font-medium break-words shadow-sm line-clamp-none leading-relaxed ${
                      isMe 
                        ? 'bg-[#95ec69] text-gray-900 rounded-tr-none' 
                        : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700/50 rounded-tl-none'
                    }`}>
                      {msg.content}
                    </div>
                    <div className={`flex items-baseline gap-1.5 ${isMe ? 'flex-row-reverse self-end' : 'flex-row self-start'}`}>
                      <span className="text-[8px] font-bold theme-muted opacity-40 px-1">
                        {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {isMe && (() => {
                        const othersReadCount = channelMembers.filter(m => 
                          m.user_id !== currentUserId && 
                          m.last_read_at && 
                          new Date(m.last_read_at).getTime() + 2000 >= new Date(msg.created_at).getTime()
                        ).length
                        
                        if (othersReadCount > 0) {
                          const totalOthers = channelMembers.length - 1
                          return (
                            <span className="text-[9px] font-black text-[#06C755] animate-in fade-in slide-in-from-right-1 duration-500">
                              {totalOthers > 1 ? `既読 ${othersReadCount}` : '既読'}
                            </span>
                          )
                        }
                        return null
                      })()}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Input Area */}
        <div className="shrink-0 p-4 md:p-8 border-t theme-border bg-white/5 backdrop-blur-md pb-safe">
          <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`${activeChannel?.name || 'チャンネル'}に書き込む...`}
                rows={1}
                className="w-full bg-white/5 border theme-border rounded-2xl px-5 py-3.5 text-sm theme-text focus:outline-none focus:border-brand-primary/50 transition-all resize-none max-h-32 hide-scrollbar"
                disabled={!activeChannelId}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend(e)
                  }
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!inputText.trim() || isSending || !activeChannelId}
              className="w-12 h-12 rounded-2xl bg-[#06C755] text-white flex items-center justify-center shadow-lg shadow-[#06C755]/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
            >
              {isSending ? (
                 <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                 <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        </div>
      </div>

        </>
      )}

      {/* Channel Settings / Management Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-md glass-card p-0 rounded-[2.5rem] theme-border shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b theme-border flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center border border-brand-primary/30">
                  <Settings className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-black theme-text">チャンネル設定</h3>
                  <p className="text-xs theme-muted font-bold uppercase tracking-widest">{activeChannel?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowSettings(false)}
                className="p-2 theme-muted hover:theme-text transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 custom-scrollbar">
              
              {/* --- 管理者用メニュー --- */}
              {activeChannel?.created_by === currentUserId && (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black theme-muted uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <Shield className="w-3 h-3" />
                    ルーム管理
                  </h4>
                  <div className="p-4 bg-white/5 border theme-border rounded-3xl space-y-4">
                    
                    {/* ルーム名変更 */}
                    {isEditingName ? (
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1 theme-elevated border theme-border rounded-xl px-4 py-2 text-sm theme-text focus:outline-none focus:border-[#06C755]/50"
                        />
                        <button 
                          disabled={!editName.trim() || editName === activeChannel.name}
                          onClick={async () => {
                            if (!activeChannelId) return
                            const res = await updateChannelName(hakoId, activeChannelId, editName)
                            if (res.success) {
                              setChannels(prev => prev.map(c => c.id === activeChannelId ? { ...c, name: editName } : c))
                              setIsEditingName(false)
                            } else {
                              alert(res.error)
                            }
                          }}
                          className="px-4 py-2 bg-[#06C755] text-white rounded-xl text-sm font-bold disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                        >
                          保存
                        </button>
                        <button 
                          onClick={() => setIsEditingName(false)}
                          className="px-3 py-2 theme-muted hover:theme-text rounded-xl"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsEditingName(true)}
                        className="w-full flex items-center gap-3 p-3 theme-surface border theme-border rounded-2xl hover:theme-elevated transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center group-hover:bg-blue-500/20 transition-all">
                          <Edit2 className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="block text-sm font-bold theme-text">ルーム名を変更</span>
                          <span className="block text-[10px] theme-muted font-bold mt-0.5">{activeChannel?.name}</span>
                        </div>
                      </button>
                    )}

                    {/* メンバー招待 */}
                    {showInvite ? (
                      <div className="space-y-3">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 theme-muted" />
                          <input
                            type="text"
                            value={memberSearch}
                            onChange={(e) => setMemberSearch(e.target.value)}
                            placeholder="追加するメンバーを検索..."
                            className="w-full theme-elevated border theme-border rounded-xl pl-10 pr-4 py-2 text-sm theme-text focus:outline-none focus:border-[#06C755]/50"
                          />
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                          {members
                            .filter(m => !channelMembers.some(cm => cm.user_id === m.user_id))
                            .filter(m => !memberSearch || m.display_name?.toLowerCase().includes(memberSearch.toLowerCase()))
                            .map(m => (
                              <button
                                key={m.user_id}
                                onClick={() => setSelectedMemberIds(prev => prev.includes(m.user_id) ? prev.filter(id => id !== m.user_id) : [...prev, m.user_id])}
                                className={`w-full flex items-center justify-between p-2 rounded-lg text-sm transition-all ${selectedMemberIds.includes(m.user_id) ? 'bg-[#06C755]/10 text-[#06C755]' : 'hover:bg-white/5 theme-text'}`}
                              >
                                <span>{(m.display_name && m.display_name.trim()) || `名無しメンバー (${m.user_id.substring(0, 4)})`}</span>
                                {selectedMemberIds.includes(m.user_id) && <Check className="w-4 h-4" />}
                              </button>
                            ))}
                        </div>
                        <div className="flex gap-2">
                          <button 
                            disabled={selectedMemberIds.length === 0}
                            onClick={async () => {
                              if (!activeChannelId) return
                              const res = await addChannelMembers(hakoId, activeChannelId, selectedMemberIds)
                              if (res.success) {
                                setShowInvite(false)
                                setSelectedMemberIds([])
                                setMemberSearch('')
                                const updatedM = await getChannelMembers(hakoId, activeChannelId)
                                setChannelMembers(updatedM)
                              } else {
                                alert(res.error)
                              }
                            }}
                            className="flex-1 py-2 bg-[#06C755] text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:scale-105 active:scale-95 transition-all"
                          >
                            {selectedMemberIds.length}人を追加
                          </button>
                          <button onClick={() => setShowInvite(false)} className="flex-1 py-2 theme-muted hover:theme-text border theme-border rounded-xl text-sm font-bold">
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setShowInvite(true)}
                        className="w-full flex items-center gap-3 p-3 theme-surface border theme-border rounded-2xl hover:theme-elevated transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center group-hover:bg-[#06C755]/20 transition-all">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="block text-sm font-bold theme-text">メンバーを追加招待</span>
                          <span className="block text-[10px] theme-muted font-bold mt-0.5">現在 {channelMembers.length}名</span>
                        </div>
                      </button>
                    )}

                  </div>
                </div>
              )}

              {/* --- メンバー一覧 --- */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-black theme-muted uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                  <Users className="w-3 h-3" />
                  参加メンバー ({channelMembers.length})
                </h4>
                <div className="grid gap-3">
                  {isSettingsLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3">
                      <Loader2 className="w-6 h-6 animate-spin theme-muted" />
                      <p className="text-[10px] font-black theme-muted uppercase tracking-widest">メンバーを読込中...</p>
                    </div>
                  ) : channelMembers.length === 0 ? (
                    <p className="text-sm theme-muted py-4 text-center font-medium">メンバーはいません</p>
                  ) : (
                    channelMembers.map((m) => (
                      <div key={m.user_id} className="flex items-center justify-between p-3 theme-surface border theme-border rounded-2xl group transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-primary/20 shrink-0 border theme-border">
                            {m.avatar_url ? (
                              <Image src={m.avatar_url} alt="" width={40} height={40} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-brand-primary/20 text-brand-primary font-black text-sm">
                                {m.display_name?.charAt(0) || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold theme-text truncate">{m.display_name || 'ユーザー'}</span>
                            <span className="text-[10px] theme-muted font-bold uppercase tracking-widest">{m.role === 'owner' ? 'オーナー' : '一般メンバー'}</span>
                          </div>
                        </div>
                        {m.role === 'owner' && <Shield className="w-4 h-4 text-amber-500/50" />}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 border-t theme-border bg-white/5 space-y-4">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-4 theme-surface border theme-border theme-text hover:theme-elevated rounded-2xl font-black text-sm transition-all active:scale-95"
              >
                閉じる
              </button>
              {activeChannel?.created_by === currentUserId && (
                <button
                  onClick={() => {
                    if (activeChannelId) handleDeleteChannel(activeChannelId)
                  }}
                  className="w-full py-4 text-red-500 hover:bg-red-500/10 border border-transparent rounded-2xl font-black text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  管理：このルームをデータベースから完全に削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


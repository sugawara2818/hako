'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getChatMessages, sendChatMessage, getChatChannels, createChatChannel, deleteChatChannel, markChannelAsRead } from '@/core/chat/actions'
import { Hash, Send, Loader2, Menu, Trash2, Users, MessageCircle, ChevronLeft } from 'lucide-react'
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
  last_message_content?: string | null
  last_message_at?: string | null
  unreadCount?: number
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
}

export function ChatView({ hakoId, currentUserId, currentUserName, currentUserAvatar, isOwner }: ChatViewProps) {
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isChannelsLoading, setIsChannelsLoading] = useState(true)
  const [isMessagesLoading, setIsMessagesLoading] = useState(false)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

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
    const fetchChannels = async () => {
      setIsChannelsLoading(true)
      const channelsData = await getChatChannels(hakoId)
      setChannels(channelsData)
      
      // Removed automatic selection of first channel to show list first
      setIsChannelsLoading(false)
    }

    fetchChannels()

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
      const msgs = await getChatMessages(hakoId, activeChannelId)
      setMessages(msgs)
      setIsMessagesLoading(false)
      scrollToBottom()
    }

    fetchInitialMessages()
    
    // Mark as read when entering channel
    markChannelAsRead(hakoId, activeChannelId)

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

    // Optimistic Update
    const tempId = `temp-${Date.now()}`
    const optimisticMessage: ChatMessage = {
      id: tempId,
      content: messageContent,
      created_at: new Date().toISOString(),
      user_id: currentUserId,
      userName: currentUserName,
      userAvatar: currentUserAvatar,
      channel_id: activeChannelId
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    scrollToBottom()

    try {
      const result = await sendChatMessage(hakoId, activeChannelId, messageContent)
      if (result.success) {
        setMessages(prev => prev.map(m => m.id === tempId ? {
          ...m,
          id: result.data.id,
          created_at: result.data.created_at
        } : m))
      } else {
        alert(result.error)
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setInputText(messageContent)
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInputText(messageContent)
    } finally {
      setIsSending(false)
    }
  }

  const handleCreateChannel = async (name: string, description: string, type: 'public' | 'private', memberIds: string[]) => {
    const res = await createChatChannel(hakoId, name, description, type, memberIds)
    if (res.success) {
      setChannels(prev => [...prev, res.data])
      setActiveChannelId(res.data.id)
    } else {
      alert(res.error)
    }
  }

  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('チャンネルを削除してもよろしいですか？メッセージもすべて削除されます。')) return
    const res = await deleteChatChannel(hakoId, channelId)
    if (res.success) {
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

  const activeChannel = channels.find(c => c.id === activeChannelId)

  if (isChannelsLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary/50" />
        <p className="text-xs font-black theme-muted uppercase tracking-widest">チャンネルを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex overflow-hidden theme-bg">
      {/* 1. Channel List (Home View) */}
      {!activeChannelId ? (
        <div className="flex-1 flex flex-col min-w-0 h-full">
           <ChannelSidebar 
            channels={channels}
            members={members}
            activeChannelId=""
            onChannelSelect={(id) => {
              setActiveChannelId(id)
            }}
            onCreateChannel={handleCreateChannel}
            onDeleteChannel={handleDeleteChannel}
            isOwner={isOwner}
          />
        </div>
      ) : (
        <>
          {/* 2. Sidebar - Desktop (Only shown on very large screens if preferred, but here we go full chat) */}
          <div className="hidden lg:block">
            <ChannelSidebar 
              channels={channels}
              members={members}
              activeChannelId={activeChannelId}
              onChannelSelect={(id) => {
                setActiveChannelId(id)
              }}
              onCreateChannel={handleCreateChannel}
              onDeleteChannel={handleDeleteChannel}
              isOwner={isOwner}
            />
          </div>

          {/* 3. Main Chat Area */}
          <div className="flex-1 flex flex-col min-w-0 h-full relative">
            {/* Unified Header */}
            <div className="h-14 border-b theme-border flex items-center px-4 md:px-6 bg-white/5 backdrop-blur-md justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => setActiveChannelId(null)}
                  className="p-2 -ml-2 theme-muted hover:theme-text transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2 min-w-0 text-brand-primary">
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
            </div>

        {/* Chat Messages */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth hide-scrollbar transition-all"
        >
          {isMessagesLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-brand-primary/50" />
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
                    <span className="text-[8px] font-bold theme-muted opacity-40 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
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
              className="w-12 h-12 rounded-2xl bg-brand-primary text-gray-800 flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
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
    </div>
  )
}

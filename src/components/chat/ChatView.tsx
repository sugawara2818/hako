'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { getChatMessages, sendChatMessage } from '@/core/chat/actions'
import { Loader2, Send, MessageCircle } from 'lucide-react'
import Image from 'next/image'

interface ChatMessage {
  id: string
  content: string
  created_at: string
  user_id: string
  userName: string
  userAvatar: string | null
}

interface ChatViewProps {
  hakoId: string
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
}

export function ChatView({ hakoId, currentUserId, currentUserName, currentUserAvatar }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [inputText, setInputText] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchInitialMessages = async () => {
      setIsLoading(true)
      const msgs = await getChatMessages(hakoId)
      setMessages(msgs)
      setIsLoading(false)
      scrollToBottom()
    }

    fetchInitialMessages()

    const channel = supabase
      .channel(`chat:${hakoId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `hako_id=eq.${hakoId}`,
        },
        async (payload: { new: { id: string; content: string; created_at: string; user_id: string } }) => {
          // If it's my own message, it's already added optimistically (or will be shortly)
          // We can check if it exists or just ignore if it's from currentUserId to avoid extra fetch
          // However, for consistency, we want the "real" message from server too.
          // Let's check if the ID is already in our list (optimistic ID won't match, but we can use a temp ID)
          
          setMessages((prev) => {
            const exists = prev.some(m => m.id === payload.new.id)
            if (exists) return prev

            // If it's from another user, we need their info. 
            // If it's from me, we use our local current info.
            const isMe = payload.new.user_id === currentUserId
            
            if (isMe) {
               return [...prev, {
                  id: payload.new.id,
                  content: payload.new.content,
                  created_at: payload.new.created_at,
                  user_id: payload.new.user_id,
                  userName: currentUserName,
                  userAvatar: currentUserAvatar,
               }]
            }

            // For other users, we do the fetch
            fetchMemberInfo(payload.new)
            return prev
          })
          scrollToBottom()
        }
      )
      .subscribe()

    const fetchMemberInfo = async (msgPayload: any) => {
      const { data: member } = await supabase
        .from('hako_members')
        .select('display_name, avatar_url')
        .eq('hako_id', hakoId)
        .eq('user_id', msgPayload.user_id)
        .single()

      const newMessage: ChatMessage = {
        id: msgPayload.id,
        content: msgPayload.content,
        created_at: msgPayload.created_at,
        user_id: msgPayload.user_id,
        userName: member?.display_name || 'ユーザー',
        userAvatar: member?.avatar_url || null,
      }

      setMessages((prev) => {
        if (prev.some(m => m.id === newMessage.id)) return prev
        return [...prev, newMessage]
      })
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [hakoId, currentUserId, currentUserName, currentUserAvatar])

  const scrollToBottom = () => {
    setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight
      }
    }, 100)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isSending) return

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
      userAvatar: currentUserAvatar
    }
    
    setMessages(prev => [...prev, optimisticMessage])
    scrollToBottom()

    try {
      const result = await sendChatMessage(hakoId, messageContent)
      if (result.success) {
        // Replace temp message with real one to avoid flicker or duplication
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

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-brand-primary/50" />
        <p className="text-xs font-black theme-muted uppercase tracking-widest">チャットを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden theme-bg">
      {/* Chat Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth hide-scrollbar transition-all"
      >
        {messages.length === 0 ? (
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
              placeholder="メッセージを入力..."
              rows={1}
              className="w-full bg-white/5 border theme-border rounded-2xl px-5 py-3.5 text-sm theme-text focus:outline-none focus:border-brand-primary/50 transition-all resize-none max-h-32 hide-scrollbar"
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
            disabled={!inputText.trim() || isSending}
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
  )
}

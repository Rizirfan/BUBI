import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { api } from '@/services/api'
import { getSocket } from '@/services/socket'
import { db } from '@/db/client'
import type { Conversation, Message, Reaction } from '@/types'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Composer } from '@/components/chat/Composer'

function uid() { return crypto.randomUUID() }

export function ChatScreen() {
  const { user, token, logout } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [users, setUsers] = useState<{ id: string; username: string; displayName: string }[]>([])
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  const active = useMemo(() => conversations.find(c => c.id === activeId) || null, [conversations, activeId])

  async function refreshConversations() {
    const res = await api.conversations()
    setConversations(res.conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt))
    for (const c of res.conversations) await db.conversations.put(c)
  }

  async function loadMessages(conversationId: string) {
    setLoading(true)
    try {
      const res = await api.messages(conversationId)
      setMessages(res.messages)
      setReactions(res.reactions)
      await db.messages.bulkPut(res.messages)
      await db.reactions.bulkPut(res.reactions)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    if (!token || !user) return
    void refreshConversations()
    void api.users().then(r => setUsers(r.users)).catch(() => {})
    const socket = getSocket(token)

    const onNew = (msg: Message) => {
      if (msg.conversationId === activeIdRef.current) {
        setMessages(prev => prev.some(m => m.id === msg.id || (m.clientNonce && m.clientNonce === msg.clientNonce)) ? prev.map(m => (m.id === msg.id || m.clientNonce === msg.clientNonce) ? msg : m) : [...prev, msg])
      }
      setConversations(prev => prev.map(c => c.id === msg.conversationId ? { ...c, lastMessagePreview: msg.text, lastMessageAt: msg.createdAt, updatedAt: msg.createdAt } : c).sort((a,b)=>b.lastMessageAt-a.lastMessageAt))
      void db.messages.put(msg)
    }
    const onReaction = ({ action, reaction }: { action: 'added' | 'removed'; reaction: Reaction }) => {
      if (reaction.messageId && messages) {
        setReactions(prev => action === 'removed' ? prev.filter(r => r.id !== reaction.id) : prev.some(r => r.id === reaction.id) ? prev : [...prev, reaction])
        if (action === 'removed') void db.reactions.delete(reaction.id)
        else void db.reactions.put(reaction)
      }
    }
    const onConvUpdated = () => { void refreshConversations() }

    socket.on('message:new', onNew)
    socket.on('reaction:updated', onReaction)
    socket.on('conversation:updated', onConvUpdated)
    return () => {
      socket.off('message:new', onNew)
      socket.off('reaction:updated', onReaction)
      socket.off('conversation:updated', onConvUpdated)
    }
  }, [token, user])

  useEffect(() => {
    if (!activeId || !token) return
    const socket = getSocket(token)
    socket.emit('conversation:join', activeId)
    void loadMessages(activeId)
    setSidebarOpen(false)
  }, [activeId, token])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, activeId])

  async function startDirect(userId: string) {
    const res = await api.createDirect(userId)
    setShowNew(false)
    await refreshConversations()
    setActiveId(res.conversation.id)
  }

  async function send(text: string, emojiIds: string[]) {
    if (!activeId || !user || !token) return
    const clientNonce = uid()
    const optimistic: Message = {
      id: `local-${clientNonce}`, conversationId: activeId, senderId: user.id, text, emojiIds,
      status: 'pending', createdAt: Date.now(), updatedAt: Date.now(), clientNonce,
    }
    setMessages(prev => [...prev, optimistic])
    await db.messages.put(optimistic)
    const socket = getSocket(token)
    socket.emit('message:send', { conversationId: activeId, text, emojiIds, clientNonce }, (ack: any) => {
      if (ack?.ok && ack.message) {
        setMessages(prev => prev.map(m => m.clientNonce === clientNonce ? ack.message : m))
        void db.messages.delete(optimistic.id)
        void db.messages.put(ack.message)
      } else {
        setMessages(prev => prev.map(m => m.clientNonce === clientNonce ? { ...m, status: 'failed' } : m))
      }
    })
  }

  async function toggleReaction(messageId: string, emojiId: string) {
    if (!token) return
    const socket = getSocket(token)
    socket.emit('reaction:toggle', { messageId, emojiId }, (ack: any) => {
      if (!ack?.ok) return
      // optimistic-ish handled by socket event; but add fallback
      if (ack.action === 'added' && ack.reaction) {
        setReactions(prev => prev.some(r => r.id === ack.reaction.id) ? prev : [...prev, ack.reaction])
      }
      if (ack.action === 'removed') {
        setReactions(prev => prev.filter(r => !(r.messageId === messageId && r.userId === user?.id && r.emojiId === emojiId)))
      }
    })
  }

  function titleFor(c: Conversation) {
    if (!user) return 'Chat'
    const otherId = c.participantIds.find(id => id !== user.id)
    return (otherId && c.participantNames?.[otherId]) || c.title || 'Chat'
  }

  return (
    <div className="h-full flex bg-[var(--bg)]">
      <aside className={`${sidebarOpen ? 'flex' : 'hidden'} md:flex flex-col w-full md:w-[340px] border-r border-black/10 bg-white/80 backdrop-blur`}>
        <div className="px-4 pt-[calc(12px+var(--safe-top))] pb-3 border-b border-black/5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[var(--muted)]">Signed in as</div>
              <div className="font-semibold">{user?.displayName}</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNew(v => !v)} className="px-3 py-1.5 rounded-full bg-[var(--blue)] text-white text-sm">New</button>
              <button onClick={logout} className="px-3 py-1.5 rounded-full bg-[var(--surface-2)] text-sm">Logout</button>
            </div>
          </div>
          {showNew && (
            <div className="mt-3 bg-[var(--bg)] rounded-2xl p-2 max-h-52 overflow-auto">
              <div className="text-xs text-[var(--muted)] px-2 py-1">Start a chat</div>
              {users.length === 0 && <div className="text-sm text-[var(--muted)] px-2 py-2">No other users yet.</div>}
              {users.map(u => (
                <button key={u.id} onClick={() => void startDirect(u.id)} className="w-full text-left px-3 py-2 rounded-xl hover:bg-white">
                  <div className="font-medium text-sm">{u.displayName}</div>
                  <div className="text-xs text-[var(--muted)]">@{u.username}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex-1 overflow-auto p-2">
          {conversations.map(c => (
            <button key={c.id} onClick={() => setActiveId(c.id)}
              className={`w-full text-left px-3 py-3 rounded-2xl mb-1 ${activeId === c.id ? 'bg-[var(--blue)]/10' : 'hover:bg-black/5'}`}>
              <div className="flex justify-between gap-2">
                <div className="font-medium truncate">{titleFor(c)}</div>
                <div className="text-[11px] text-[var(--muted)] shrink-0">{new Date(c.lastMessageAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
              </div>
              <div className="text-sm text-[var(--muted)] truncate">{c.lastMessagePreview || 'No messages yet'}</div>
            </button>
          ))}
          {conversations.length === 0 && <div className="text-sm text-[var(--muted)] p-4 text-center">No conversations. Tap New to start one.</div>}
        </div>
      </aside>

      <main className={`${sidebarOpen ? 'hidden md:flex' : 'flex'} flex-1 flex-col min-w-0`}>
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
            <div className="text-center">
              <div className="text-lg font-medium text-black">Messages</div>
              <p className="text-sm mt-1">Select a conversation or start a new one.</p>
              <button onClick={() => setSidebarOpen(true)} className="md:hidden mt-4 px-4 py-2 rounded-full bg-[var(--blue)] text-white text-sm">Open conversations</button>
            </div>
          </div>
        ) : (
          <>
            <header className="px-4 pt-[calc(10px+var(--safe-top))] pb-3 border-b border-black/10 bg-white/80 backdrop-blur flex items-center gap-3">
              <button onClick={() => setSidebarOpen(true)} className="md:hidden text-[var(--blue)] text-sm">Back</button>
              <div className="min-w-0">
                <div className="font-semibold truncate">{titleFor(active)}</div>
                <div className="text-xs text-[var(--muted)]">Text · Custom emojis · Reactions</div>
              </div>
            </header>

            <div className="flex-1 overflow-auto px-3 py-4 space-y-1">
              {loading && <div className="text-center text-sm text-[var(--muted)] py-4">Loading messages…</div>}
              {messages.map((m, i) => {
                const prev = messages[i - 1]
                const mine = m.senderId === user?.id
                const showTail = !messages[i + 1] || messages[i + 1].senderId !== m.senderId
                const showTime = !prev || (m.createdAt - prev.createdAt > 5 * 60 * 1000)
                return (
                  <div key={m.id || m.clientNonce}>
                    {showTime && <div className="text-[11px] text-[var(--muted)] text-center my-3">{new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</div>}
                    <MessageBubble
                      message={m}
                      mine={mine}
                      showTail={showTail}
                      reactions={reactions.filter(r => r.messageId === m.id)}
                      currentUserId={user?.id || ''}
                      onToggleReaction={(emojiId) => void toggleReaction(m.id, emojiId)}
                    />
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            <Composer onSend={(text, emojiIds) => void send(text, emojiIds)} />
          </>
        )}
      </main>
    </div>
  )
}

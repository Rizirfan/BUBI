import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { api } from '@/services/api'
import { getSocket } from '@/services/socket'
import { db } from '@/db/client'
import type { Conversation, Message, Reaction } from '@/types'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Composer } from '@/components/chat/Composer'
import { EMOJI_MAP } from '@/features/emojis/emoji'

function uid() {
  return crypto.randomUUID()
}

function getAvatarGradient(name: string) {
  const gradients = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-500',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-violet-500 to-indigo-600',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase())
      .join('') || 'U'
  )
}

function renderSnippet(text: string) {
  if (!text) return 'No messages yet'
  // Replace [:emoji:] with emoji label or clean text for snippets
  return text.replace(/\[:([a-z0-9_-]+):\]/g, (_, id) => `[${EMOJI_MAP[id]?.label || id}]`)
}

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
  const [searchQuery, setSearchQuery] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  )

  async function refreshConversations() {
    try {
      const res = await api.conversations()
      setConversations(res.conversations.sort((a, b) => b.lastMessageAt - a.lastMessageAt))
      for (const c of res.conversations) await db.conversations.put(c)
    } catch (err) {
      console.error('Failed to refresh conversations', err)
    }
  }

  async function loadMessages(conversationId: string) {
    setLoading(true)
    try {
      const res = await api.messages(conversationId)
      setMessages(res.messages)
      setReactions(res.reactions)
      await db.messages.bulkPut(res.messages)
      await db.reactions.bulkPut(res.reactions)
    } catch (err) {
      console.error('Failed to load messages', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!token || !user) return
    void refreshConversations()
    void api.users().then((r) => setUsers(r.users)).catch(() => {})
    const socket = getSocket(token)

    const onNew = (msg: Message) => {
      if (msg.conversationId === activeIdRef.current) {
        setMessages((prev) =>
          prev.some(
            (m) =>
              m.id === msg.id ||
              (m.clientNonce && m.clientNonce === msg.clientNonce),
          )
            ? prev.map((m) =>
                m.id === msg.id || m.clientNonce === msg.clientNonce ? msg : m,
              )
            : [...prev, msg],
        )
      }
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === msg.conversationId
              ? {
                  ...c,
                  lastMessagePreview: msg.text,
                  lastMessageAt: msg.createdAt,
                  updatedAt: msg.createdAt,
                }
              : c,
          )
          .sort((a, b) => b.lastMessageAt - a.lastMessageAt),
      )
      void db.messages.put(msg)
    }

    const onReaction = ({
      action,
      reaction,
    }: {
      action: 'added' | 'removed'
      reaction: Reaction
    }) => {
      if (reaction.messageId) {
        setReactions((prev) =>
          action === 'removed'
            ? prev.filter((r) => r.id !== reaction.id)
            : prev.some((r) => r.id === reaction.id)
              ? prev
              : [...prev, reaction],
        )
        if (action === 'removed') void db.reactions.delete(reaction.id)
        else void db.reactions.put(reaction)
      }
    }

    const onConvUpdated = () => {
      void refreshConversations()
    }

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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, activeId])

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
      id: `local-${clientNonce}`,
      conversationId: activeId,
      senderId: user.id,
      text,
      emojiIds,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      clientNonce,
    }
    setMessages((prev) => [...prev, optimistic])
    await db.messages.put(optimistic)
    const socket = getSocket(token)
    socket.emit(
      'message:send',
      { conversationId: activeId, text, emojiIds, clientNonce },
      (ack: any) => {
        if (ack?.ok && ack.message) {
          setMessages((prev) =>
            prev.map((m) => (m.clientNonce === clientNonce ? ack.message : m)),
          )
          void db.messages.delete(optimistic.id)
          void db.messages.put(ack.message)
        } else {
          setMessages((prev) =>
            prev.map((m) =>
              m.clientNonce === clientNonce ? { ...m, status: 'failed' } : m,
            ),
          )
        }
      },
    )
  }

  async function toggleReaction(messageId: string, emojiId: string) {
    if (!token) return
    const socket = getSocket(token)
    socket.emit('reaction:toggle', { messageId, emojiId }, (ack: any) => {
      if (!ack?.ok) return
      if (ack.action === 'added' && ack.reaction) {
        setReactions((prev) =>
          prev.some((r) => r.id === ack.reaction.id) ? prev : [...prev, ack.reaction],
        )
      }
      if (ack.action === 'removed') {
        setReactions((prev) =>
          prev.filter(
            (r) =>
              !(
                r.messageId === messageId &&
                r.userId === user?.id &&
                r.emojiId === emojiId
              ),
          ),
        )
      }
    })
  }

  function titleFor(c: Conversation) {
    if (!user) return 'Chat'
    const otherId = c.participantIds.find((id) => id !== user.id)
    return (otherId && c.participantNames?.[otherId]) || c.title || 'Chat'
  }

  function otherParticipant(c: Conversation) {
    if (!user) return null
    const otherId = c.participantIds.find((id) => id !== user.id)
    if (!otherId) return null
    const otherUser = users.find((u) => u.id === otherId)
    return {
      id: otherId,
      name: c.participantNames?.[otherId] || otherUser?.displayName || 'Chat',
      username: otherUser?.username || '',
    }
  }

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const q = searchQuery.toLowerCase()
    return conversations.filter((c) => {
      const name = titleFor(c).toLowerCase()
      const preview = (c.lastMessagePreview || '').toLowerCase()
      return name.includes(q) || preview.includes(q)
    })
  }, [conversations, searchQuery, user])

  const filteredUsers = useMemo(() => {
    const nonSelf = users.filter((u) => u.id !== user?.id)
    if (!userSearchQuery.trim()) return nonSelf
    const q = userSearchQuery.toLowerCase()
    return nonSelf.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    )
  }, [users, userSearchQuery, user])

  return (
    <div className="h-full flex bg-[#09090b] text-[#f4f4f5] overflow-hidden">
      {/* ===================== SIDEBAR ===================== */}
      <aside
        className={`${
          sidebarOpen ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-[360px] lg:w-[380px] shrink-0 border-r border-white/8 bg-[#0e0f16]/95 backdrop-blur-xl z-20`}
      >
        {/* User Identity & Top Actions Bar */}
        <div className="px-4 pt-[calc(14px+var(--safe-top))] pb-3.5 border-b border-white/8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${getAvatarGradient(
                  user?.displayName || 'User',
                )} flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-950/50 shrink-0`}
              >
                {getInitials(user?.displayName || 'User')}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm text-white truncate leading-tight">
                  {user?.displayName}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate">@{user?.username}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {/* New Chat Button */}
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
                title="Start New Conversation"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                <span>New</span>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
                title="Sign out"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search Conversations Input */}
          <div className="mt-3.5 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations…"
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500/50 focus:bg-white/8 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((c) => {
            const title = titleFor(c)
            const isActive = activeId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left p-3 rounded-2xl transition-all cursor-pointer flex items-center gap-3 relative ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-900/30 to-blue-900/20 border border-indigo-500/30 shadow-md shadow-indigo-950/20'
                    : 'hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <div className="absolute left-1 top-3 bottom-3 w-1 bg-indigo-500 rounded-full" />
                )}

                {/* Avatar */}
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                    title,
                  )} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}
                >
                  {getInitials(title)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={`text-sm font-semibold truncate ${
                        isActive ? 'text-white' : 'text-zinc-200'
                      }`}
                    >
                      {title}
                    </span>
                    <span className="text-[11px] text-zinc-500 shrink-0">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {renderSnippet(c.lastMessagePreview || '')}
                  </p>
                </div>
              </button>
            )
          })}

          {filteredConversations.length === 0 && (
            <div className="py-12 px-4 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-500">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <div className="text-sm font-medium text-zinc-300">
                {searchQuery ? 'No matching conversations' : 'No conversations yet'}
              </div>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                {searchQuery
                  ? 'Try searching with a different name or keyword.'
                  : 'Start your first direct chat with any registered user.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  onClick={() => setShowNew(true)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all inline-flex items-center gap-1.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Start a Chat</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* ===================== MAIN CHAT AREA ===================== */}
      <main
        className={`${
          sidebarOpen ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col min-w-0 bg-[#09090b] relative`}
      >
        {!active ? (
          /* Empty Selection State */
          <div className="flex-1 flex items-center justify-center p-6 text-center">
            <div className="max-w-md space-y-4 animate-enter">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto text-indigo-400 shadow-xl shadow-indigo-950/50">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  BUBI Messenger
                </h2>
                <p className="text-sm text-zinc-400 max-w-sm mx-auto">
                  Select a conversation from the left or create a new direct chat to begin exchanging messages and custom vector reactions.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNew(true)}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>New Conversation</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-medium"
                >
                  View Chats
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat View */
          <>
            {/* Conversation Header */}
            <header className="px-4 pt-[calc(12px+var(--safe-top))] pb-3 border-b border-white/8 bg-[#0d0e15]/90 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back Button */}
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 active:scale-95 transition"
                  aria-label="Back to conversations"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                {/* Recipient Avatar */}
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                    titleFor(active),
                  )} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}
                >
                  {getInitials(titleFor(active))}
                </div>

                <div className="min-w-0">
                  <div className="font-semibold text-sm text-white truncate leading-tight">
                    {titleFor(active)}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="truncate">Live Sync Active</span>
                  </div>
                </div>
              </div>

              {/* Header Right Badges */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-400">
                  <span>100% Vector</span>
                </div>
              </div>
            </header>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-2">
              {loading && (
                <div className="text-center py-6 text-xs text-zinc-500 animate-pulse">
                  Syncing messages…
                </div>
              )}

              {messages.length === 0 && !loading && (
                <div className="text-center py-16 space-y-2 text-zinc-500">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-zinc-400">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </div>
                  <div className="text-sm font-medium text-zinc-300">
                    Start the conversation
                  </div>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                    Type a message below or insert custom vector emojis like [:spark:] and [:bloom:].
                  </p>
                </div>
              )}

              {messages.map((m, i) => {
                const prev = messages[i - 1]
                const mine = m.senderId === user?.id
                const showTail =
                  !messages[i + 1] || messages[i + 1].senderId !== m.senderId
                const showTime =
                  !prev || m.createdAt - prev.createdAt > 5 * 60 * 1000

                return (
                  <div key={m.id || m.clientNonce} className="animate-enter">
                    {showTime && (
                      <div className="flex justify-center my-4">
                        <span className="text-[11px] font-medium text-zinc-400 bg-white/5 border border-white/10 px-3 py-0.5 rounded-full">
                          {new Date(m.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                    <MessageBubble
                      message={m}
                      mine={mine}
                      showTail={showTail}
                      reactions={reactions.filter((r) => r.messageId === m.id)}
                      currentUserId={user?.id || ''}
                      onToggleReaction={(emojiId) => void toggleReaction(m.id, emojiId)}
                    />
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <Composer onSend={(text, emojiIds) => void send(text, emojiIds)} />
          </>
        )}
      </main>

      {/* ===================== NEW CHAT MODAL ===================== */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-enter">
          <div className="w-full max-w-md bg-[#12131d] border border-white/10 rounded-3xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Start New Chat</h3>
                <p className="text-xs text-zinc-400">Choose a user to begin a direct conversation</p>
              </div>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition"
              >
                ✕
              </button>
            </div>

            {/* Search user input */}
            <div className="relative">
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Search by name or @handle…"
                className="w-full bg-[#181926] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* User List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
              {filteredUsers.length === 0 && (
                <div className="py-6 text-center text-xs text-zinc-500">
                  {users.length === 1
                    ? 'No other users registered yet. Invite someone or create a second account to test!'
                    : 'No users match your search.'}
                </div>
              )}
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => void startDirect(u.id)}
                  className="w-full text-left p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] border border-white/5 hover:border-indigo-500/40 transition-all flex items-center justify-between gap-3 group cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(
                        u.displayName,
                      )} flex items-center justify-center text-white font-bold text-xs shrink-0`}
                    >
                      {getInitials(u.displayName)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white truncate">
                        {u.displayName}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        @{u.username}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300 shrink-0">
                    Message →
                  </span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/5 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

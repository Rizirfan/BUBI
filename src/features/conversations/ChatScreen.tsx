import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { api } from '@/services/api'
import { getSocket } from '@/services/socket'
import { db } from '@/db/client'
import type { Conversation, Message, Reaction } from '@/types'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Composer } from '@/components/chat/Composer'
import { SettingsModal } from '@/components/settings/SettingsModal'

function uid() {
  return crypto.randomUUID()
}

export function ChatScreen() {
  const { user, token } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [users, setUsers] = useState<{ id: string; username: string; displayName: string }[]>([])
  const [showNew, setShowNew] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
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
    setChatSearchOpen(false)
    setChatSearchQuery('')
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

  async function toggleReaction(messageId: string, emoji: string) {
    if (!token) return
    const socket = getSocket(token)
    socket.emit('reaction:toggle', { messageId, emojiId: emoji }, (ack: any) => {
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
                r.emojiId === emoji
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

  const displayedMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages
    const q = chatSearchQuery.toLowerCase()
    return messages.filter((m) => m.text.toLowerCase().includes(q))
  }, [messages, chatSearchQuery])

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
    <div className="h-full flex bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      {/* ===================== SIDEBAR ===================== */}
      <aside
        className={`${
          sidebarOpen ? 'flex' : 'hidden'
        } md:flex flex-col w-full md:w-[320px] lg:w-[340px] shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] z-20`}
      >
        {/* User bar */}
        <div className="px-4 pt-[calc(12px+var(--safe-top))] pb-3 border-b border-[var(--border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {user?.displayName?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{user?.displayName}</div>
                <div className="text-xs text-[var(--text-muted)] truncate">@{user?.username}</div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Settings button */}
              <button
                type="button"
                onClick={() => setShowSettings(true)}
                className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition"
                title="Settings"
                aria-label="Settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              {/* New Chat button */}
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition"
              >
                + New
              </button>
            </div>
          </div>

          {/* Search conversations */}
          <div className="mt-3 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats…"
              className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-1.5 space-y-0.5">
          {filteredConversations.map((c) => {
            const title = titleFor(c)
            const isActive = activeId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveId(c.id)}
                className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-3 ${
                  isActive
                    ? 'bg-blue-600/10 text-blue-500'
                    : 'hover:bg-[var(--surface-hover)] text-[var(--text)]'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-blue-600/20 text-blue-500 font-semibold flex items-center justify-center text-sm shrink-0">
                  {title[0]?.toUpperCase() || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">{title}</span>
                    <span className="text-[11px] text-[var(--text-muted)] shrink-0">
                      {new Date(c.lastMessageAt).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                    {c.lastMessagePreview || 'No messages yet'}
                  </p>
                </div>
              </button>
            )
          })}

          {filteredConversations.length === 0 && (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              {searchQuery ? 'No chats found' : 'No chats yet. Tap + New to start one.'}
            </div>
          )}
        </div>
      </aside>

      {/* ===================== CHAT MAIN ===================== */}
      <main
        className={`${
          sidebarOpen ? 'hidden md:flex' : 'flex'
        } flex-1 flex-col min-w-0 bg-[var(--bg)] relative`}
      >
        {!active ? (
          <div className="flex-1 flex items-center justify-center p-4 text-center">
            <div className="space-y-2 text-[var(--text-muted)]">
              <div className="text-sm font-medium">Select a chat</div>
              <p className="text-xs">Choose a conversation from the sidebar</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className="px-4 pt-[calc(10px+var(--safe-top))] pb-2.5 border-b border-[var(--border)] bg-[var(--surface)] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="md:hidden text-xs text-blue-500 font-medium"
                >
                  Back
                </button>
                <div className="w-9 h-9 rounded-full bg-blue-600/20 text-blue-500 font-semibold flex items-center justify-center text-sm shrink-0">
                  {titleFor(active)[0]?.toUpperCase() || 'C'}
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{titleFor(active)}</div>
                  <div className="text-xs text-[var(--text-muted)] truncate">
                    {otherParticipant(active)?.username
                      ? `@${otherParticipant(active)?.username}`
                      : 'Chat'}
                  </div>
                </div>
              </div>

              {/* In-chat search toggle */}
              <button
                type="button"
                onClick={() => setChatSearchOpen((v) => !v)}
                className={`p-1.5 rounded-lg text-xs transition ${
                  chatSearchOpen
                    ? 'bg-blue-600 text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]'
                }`}
                title="Search in conversation"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </button>
            </header>

            {/* In-chat search bar */}
            {chatSearchOpen && (
              <div className="px-4 py-2 bg-[var(--surface-hover)] border-b border-[var(--border)] flex items-center gap-2">
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Search in this chat…"
                  className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-lg px-3 py-1 text-xs text-[var(--text)] outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setChatSearchOpen(false)
                    setChatSearchQuery('')
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
              {loading && (
                <div className="text-center py-4 text-xs text-[var(--text-muted)]">
                  Loading…
                </div>
              )}

              {displayedMessages.length === 0 && !loading && (
                <div className="text-center py-12 text-xs text-[var(--text-muted)]">
                  {chatSearchQuery ? 'No matching messages' : 'No messages yet'}
                </div>
              )}

              {displayedMessages.map((m, i) => {
                const prev = displayedMessages[i - 1]
                const mine = m.senderId === user?.id
                const showTail =
                  !displayedMessages[i + 1] ||
                  displayedMessages[i + 1].senderId !== m.senderId
                const showTime =
                  !prev || m.createdAt - prev.createdAt > 5 * 60 * 1000

                return (
                  <div key={m.id || m.clientNonce}>
                    {showTime && (
                      <div className="text-[11px] text-[var(--text-muted)] text-center my-2">
                        {new Date(m.createdAt).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    )}
                    <MessageBubble
                      message={m}
                      mine={mine}
                      showTail={showTail}
                      reactions={reactions.filter((r) => r.messageId === m.id)}
                      currentUserId={user?.id || ''}
                      onToggleReaction={(emoji) => void toggleReaction(m.id, emoji)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-enter">
          <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">New Chat</h3>
              <button
                type="button"
                onClick={() => setShowNew(false)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                ✕
              </button>
            </div>

            <input
              type="text"
              value={userSearchQuery}
              onChange={(e) => setUserSearchQuery(e.target.value)}
              placeholder="Search users…"
              className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-1.5 text-xs text-[var(--text)] outline-none focus:border-blue-500"
            />

            <div className="max-h-56 overflow-y-auto space-y-1">
              {filteredUsers.length === 0 && (
                <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                  No users found
                </div>
              )}
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => void startDirect(u.id)}
                  className="w-full text-left p-2 rounded-xl hover:bg-[var(--surface-hover)] flex items-center justify-between text-xs transition"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{u.displayName}</div>
                    <div className="text-[11px] text-[var(--text-muted)] truncate">@{u.username}</div>
                  </div>
                  <span className="text-blue-500 font-medium">Chat</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================== SETTINGS MODAL ===================== */}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}

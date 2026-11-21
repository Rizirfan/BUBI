import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useSettingsStore } from '@/features/settings/store'
import { api } from '@/services/api'
import { getSocket } from '@/services/socket'
import { db } from '@/db/client'
import type { Conversation, Message, Reaction, UserProfile } from '@/types'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { Composer } from '@/components/chat/Composer'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { ProfileModal } from '@/components/profile/ProfileModal'
import { ContactProfileModal } from '@/components/profile/ContactProfileModal'
import { NotesPage } from '@/features/notes/NotesPage'
import { ProfilePage } from '@/features/profile/ProfilePage'
import { BubiLogo, BubiBrand } from '@/components/ui/BubiLogo'
import {
  NoteIcon,
  PenEditIcon,
  CircleUserIcon,
  NotebookIcon,
} from '@/components/ui/Icons'

function uid() {
  return crypto.randomUUID()
}

// Native Web Audio API notification chime (pleasant WhatsApp-style two-tone pop)
function playNotificationChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    if (ctx.state === 'suspended') ctx.resume()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(1174.66, ctx.currentTime) // D6
    osc.frequency.setValueAtTime(1567.98, ctx.currentTime + 0.08) // G6
    gain.gain.setValueAtTime(0.18, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.28)
  } catch {}
}

function requestNotificationPermission() {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }
}

function triggerDesktopNotification(senderName: string, text: string) {
  if (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    Notification.permission === 'granted'
  ) {
    try {
      const n = new Notification(senderName, {
        body: text,
        icon: '/icons/icon.svg',
      })
      n.onclick = () => {
        window.focus()
        n.close()
      }
    } catch {}
  }
}

export function ChatScreen() {
  const { user, token, logout } = useAuthStore()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [sidebarView, setSidebarView] = useState<'chats' | 'notes' | 'profile' | 'contacts'>('chats')
  const [menuOpen, setMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [viewingContact, setViewingContact] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [chatSearchQuery, setChatSearchQuery] = useState('')
  const [chatSearchOpen, setChatSearchOpen] = useState(false)
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem('bubi_unreads')
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  )

  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadMap).reduce((acc, count) => acc + count, 0)
  }, [unreadMap])

  const contactsWithNotesCount = useMemo(() => {
    return users.filter((u) => u.dailyNote && u.dailyNote.trim().length > 0).length
  }, [users])

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
      // 1. Immediately read from local IndexedDB so cached messages are displayed without any empty flash
      const local = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('createdAt')
      if (local && local.length > 0) {
        setMessages((prev) => {
          const pending = prev.filter(
            (m) => m.conversationId === conversationId && m.status === 'pending',
          )
          const merged = [
            ...local,
            ...pending.filter(
              (p) => !local.some((l) => l.clientNonce === p.clientNonce || l.id === p.id),
            ),
          ]
          return merged.sort((a, b) => a.createdAt - b.createdAt)
        })
      }

      // 2. Fetch fresh messages from API
      const res = await api.messages(conversationId)

      // 3. Merge server messages with any pending optimistic messages that haven't been acked yet
      setMessages((prev) => {
        const pending = prev.filter(
          (m) =>
            m.conversationId === conversationId &&
            m.status === 'pending' &&
            !res.messages.some(
              (rm) => rm.clientNonce === m.clientNonce || rm.id === m.id,
            ),
        )
        return [...res.messages, ...pending].sort((a, b) => a.createdAt - b.createdAt)
      })

      setReactions(res.reactions)
      await db.messages.bulkPut(res.messages)
      await db.reactions.bulkPut(res.reactions)
    } catch (err) {
      console.error('Failed to load messages', err)
      const local = await db.messages
        .where('conversationId')
        .equals(conversationId)
        .sortBy('createdAt')
      if (local && local.length > 0) {
        setMessages(local)
      }
    } finally {
      setLoading(false)
    }
  }

  // Clear unreads when active conversation is opened
  useEffect(() => {
    if (activeId) {
      setUnreadMap((prev) => {
        if (!prev[activeId]) return prev
        const next = { ...prev, [activeId]: 0 }
        try {
          localStorage.setItem('bubi_unreads', JSON.stringify(next))
        } catch {}
        return next
      })
    }
  }, [activeId])

  useEffect(() => {
    if (!token || !user) return
    requestNotificationPermission()
    void refreshConversations()
    void api.users().then((r) => setUsers(r.users)).catch(() => {})
    const socket = getSocket(token)

    const onNew = (msg: Message) => {
      const isMine = msg.senderId === user.id
      const isCurrentChatOpen =
        msg.conversationId === activeIdRef.current && !document.hidden

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

      // Notify on incoming message from a contact
      if (!isMine) {
        if (!isCurrentChatOpen) {
          setUnreadMap((prev) => {
            const next = {
              ...prev,
              [msg.conversationId]: (prev[msg.conversationId] || 0) + 1,
            }
            try {
              localStorage.setItem('bubi_unreads', JSON.stringify(next))
            } catch {}
            return next
          })
        }

        // Notification chime
        if (useSettingsStore.getState().soundEnabled) {
          playNotificationChime()
        }

        // Desktop/mobile web notification
        const sender =
          users.find((u) => u.id === msg.senderId)?.displayName || 'New message'
        triggerDesktopNotification(sender, msg.text)
      }
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

    const onConnect = () => {
      if (activeIdRef.current) {
        socket.emit('conversation:join', activeIdRef.current)
        void loadMessages(activeIdRef.current)
      }
      void refreshConversations()
    }

    socket.on('connect', onConnect)
    socket.on('message:new', onNew)
    socket.on('reaction:updated', onReaction)
    socket.on('conversation:updated', onConvUpdated)
    return () => {
      socket.off('connect', onConnect)
      socket.off('message:new', onNew)
      socket.off('reaction:updated', onReaction)
      socket.off('conversation:updated', onConvUpdated)
    }
  }, [token, user, users])

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

  // Close 3-dots menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  async function startDirect(userId: string) {
    try {
      const res = await api.createDirect(userId)
      setSidebarView('chats')
      await refreshConversations()
      setActiveId(res.conversation.id)
      setSidebarOpen(false)
    } catch (err) {
      console.error(err)
    }
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

    // 1. Immediately show message in the active chat view so "No messages yet" never shows
    setMessages((prev) => [...prev, optimistic])
    await db.messages.put(optimistic)

    // 2. Immediately update the conversation list in the sidebar so it displays the message preview
    //    instead of "No messages yet"
    setConversations((prev) =>
      prev
        .map((c) =>
          c.id === activeId
            ? {
                ...c,
                lastMessagePreview: text,
                lastMessageAt: optimistic.createdAt,
                updatedAt: optimistic.createdAt,
              }
            : c,
        )
        .sort((a, b) => b.lastMessageAt - a.lastMessageAt),
    )

    // 3. Send via Socket with automatic HTTP REST fallback
    let handled = false
    const confirmMessage = (serverMsg: Message) => {
      if (handled) return
      handled = true
      setMessages((prev) =>
        prev.map((m) =>
          m.clientNonce === clientNonce || m.id === optimistic.id ? serverMsg : m,
        ),
      )
      void db.messages.delete(optimistic.id)
      void db.messages.put(serverMsg)
      setConversations((prev) =>
        prev
          .map((c) =>
            c.id === activeId
              ? {
                  ...c,
                  lastMessagePreview: serverMsg.text,
                  lastMessageAt: serverMsg.createdAt,
                  updatedAt: serverMsg.createdAt,
                }
              : c,
          )
          .sort((a, b) => b.lastMessageAt - a.lastMessageAt),
      )
    }

    const socket = getSocket(token)
    if (socket.connected) {
      socket.emit(
        'message:send',
        { conversationId: activeId, text, emojiIds, clientNonce },
        (ack: any) => {
          if (ack?.ok && ack.message) {
            confirmMessage(ack.message)
          } else {
            api
              .sendMessage(activeId, { text, emojiIds, clientNonce })
              .then((res) => confirmMessage(res.message))
              .catch(() => {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.clientNonce === clientNonce ? { ...m, status: 'failed' } : m,
                  ),
                )
              })
          }
        },
      )
    }

    // Safety fallback: If socket was disconnected or ack takes longer than 2000ms, use HTTP POST
    setTimeout(() => {
      if (!handled) {
        api
          .sendMessage(activeId, { text, emojiIds, clientNonce })
          .then((res) => confirmMessage(res.message))
          .catch(() => {
            if (!handled) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.clientNonce === clientNonce ? { ...m, status: 'failed' } : m,
                ),
              )
            }
          })
      }
    }, socket.connected ? 2000 : 0)
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

  function otherParticipant(c: Conversation): UserProfile | null {
    if (!user) return null
    const otherId = c.participantIds.find((id) => id !== user.id)
    if (!otherId) return null
    const otherUser = users.find((u) => u.id === otherId)
    if (otherUser) return otherUser
    return {
      id: otherId,
      displayName: c.participantNames?.[otherId] || 'Contact',
      username: 'contact',
      bio: 'Hey there! I am using BUBI',
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
    <div className="h-full flex flex-col bg-[var(--sidebar-bg)] text-[var(--text)] overflow-hidden">
      {/* Upper Viewport Content Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* ===================== SIDEBAR ===================== */}
        <aside
          className={`${
            sidebarOpen ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-[360px] lg:w-[400px] shrink-0 border-r border-[var(--border)] bg-[var(--sidebar-bg)] z-20`}
        >
          {sidebarView !== 'contacts' ? (
          /* ================= CHATS VIEW ================= */
          <>
            {/* WhatsApp Header */}
            <div className="px-3.5 py-3 bg-[var(--header-bg)] flex items-center justify-between border-b border-[var(--border)]">
              {/* User Avatar & Profile Trigger -> Strictly redirects to Profile Page */}
              <button
                type="button"
                onClick={() => {
                  setSidebarView('profile')
                  setSidebarOpen(false)
                }}
                className="flex items-center gap-2.5 text-left cursor-pointer group min-w-0 flex-1 hover:opacity-90 transition"
                title="View your Profile & Bio page"
              >
                <div
                  style={{ backgroundColor: user?.avatarColor || undefined }}
                  className="w-10 h-10 rounded-full bg-[var(--wa-teal)] text-white font-semibold flex items-center justify-center text-sm shadow-xs shrink-0 group-hover:scale-105 transition-transform"
                >
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm leading-tight text-[var(--text)] group-hover:text-[var(--wa-green)] transition truncate">
                    {user?.displayName}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">
                    @{user?.username}
                  </div>
                </div>
              </button>

              {/* Action Icons */}
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] shrink-0">
                {/* Top Add Note / Note Pill -> Strictly redirects to Notes Page */}
                <button
                  type="button"
                  onClick={() => {
                    setSidebarView('notes')
                    setSidebarOpen(false)
                  }}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                    user?.dailyNote
                      ? 'bg-[var(--surface-active)] text-[var(--wa-green)] border-[var(--wa-green)]/30 hover:bg-[var(--surface-hover)]'
                      : 'bg-[var(--surface-hover)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text)] hover:border-[var(--wa-green)]'
                  }`}
                  title="Update your daily note on the Notes page"
                >
                  <PenEditIcon size={12} className={user?.dailyNote ? 'text-[var(--wa-green)]' : 'text-[var(--text-muted)]'} />
                  <span>{user?.dailyNote ? 'My Note' : 'Add note'}</span>
                </button>

                {/* New Chat / Contacts Icon */}
                <button
                  type="button"
                  onClick={() => setSidebarView('contacts')}
                  className="p-2 rounded-full hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition cursor-pointer"
                  title="New chat / Contacts"
                  aria-label="New chat"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    <line x1="12" y1="8" x2="12" y2="14" />
                    <line x1="9" y1="11" x2="15" y2="11" />
                  </svg>
                </button>

                {/* 3-Dots Menu Icon */}
                <div className="relative" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((v) => !v)}
                    className="p-2 rounded-full hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition cursor-pointer"
                    title="Menu"
                    aria-label="Menu"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="5" r="2" />
                      <circle cx="12" cy="12" r="2" />
                      <circle cx="12" cy="19" r="2" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 rounded-2xl bg-[var(--header-bg)] border border-[var(--border)] shadow-xl py-1.5 z-50 text-sm">
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setSidebarView('profile')
                          setSidebarOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--surface-hover)] text-[var(--text)] flex items-center justify-between"
                      >
                        <span>Profile &amp; Bio</span>
                        <CircleUserIcon size={16} className="text-[var(--text-muted)]" />
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setSidebarView('notes')
                          setSidebarOpen(false)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--surface-hover)] text-[var(--text)] flex items-center justify-between"
                      >
                        <span>Daily Notes Page</span>
                        <NotebookIcon size={16} className="text-[var(--text-muted)]" />
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setSidebarView('contacts')
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--surface-hover)] text-[var(--text)]"
                      >
                        New chat
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          setShowSettings(true)
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--surface-hover)] text-[var(--text)]"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setMenuOpen(false)
                          logout()
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[var(--surface-hover)] text-red-400"
                      >
                        Log out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search chats */}
            <div className="p-2 border-b border-[var(--border)]">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  width="16"
                  height="16"
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
                  placeholder="Search or start new chat"
                  className="w-full bg-[var(--surface-hover)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((c) => {
                const title = titleFor(c)
                const isActive = activeId === c.id
                const unread = unreadMap[c.id] || 0
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setActiveId(c.id)
                      setSidebarView('chats')
                      setSidebarOpen(false)
                    }}
                    className={`w-full text-left px-3 py-3 transition flex items-center gap-3 border-b border-[var(--border)]/40 cursor-pointer ${
                      isActive
                        ? 'bg-[var(--surface-active)]'
                        : 'hover:bg-[var(--surface-hover)]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[var(--wa-teal)] text-white font-semibold flex items-center justify-center text-base shrink-0 shadow-xs">
                      {title[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[14.5px] truncate ${
                            unread > 0
                              ? 'font-bold text-[var(--text)]'
                              : 'font-medium text-[var(--text)]'
                          }`}
                        >
                          {title}
                        </span>
                        <span
                          className={`text-[11px] shrink-0 ${
                            unread > 0
                              ? 'text-[var(--wa-green)] font-semibold'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {new Date(c.lastMessageAt).toLocaleTimeString([], {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-0.5">
                        <p
                          className={`text-[13px] truncate ${
                            unread > 0
                              ? 'text-[var(--text)] font-semibold'
                              : 'text-[var(--text-muted)]'
                          }`}
                        >
                          {c.lastMessagePreview || 'No messages yet'}
                        </p>
                        {/* WhatsApp Green Unread Message Notification Badge */}
                        {unread > 0 && (
                          <span className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--wa-green)] text-white text-[11px] font-bold flex items-center justify-center shrink-0 ml-2 shadow-xs">
                            {unread > 99 ? '99+' : unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}

              {filteredConversations.length === 0 && (
                <div className="py-16 text-center text-xs text-[var(--text-muted)] space-y-3 px-4">
                  <div>No chats yet</div>
                  <button
                    type="button"
                    onClick={() => setSidebarView('contacts')}
                    className="px-4 py-2 rounded-lg bg-[var(--wa-green)] text-white font-medium text-xs hover:bg-[var(--wa-green-hover)] transition cursor-pointer"
                  >
                    Find contacts on BUBI
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* ================= CONTACTS VIEW (WHATSAPP NEW CHAT) ================= */
          <>
            {/* WhatsApp Green Header */}
            <div className="bg-[var(--wa-teal)] text-white px-4 py-4 flex items-center gap-4 shrink-0 shadow-sm">
              <button
                type="button"
                onClick={() => setSidebarView('chats')}
                className="p-1 hover:bg-black/10 rounded-full transition cursor-pointer"
                aria-label="Back to chats"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <div>
                <h2 className="text-base font-semibold leading-tight">New chat</h2>
                <p className="text-xs text-emerald-100">{filteredUsers.length} contacts on BUBI</p>
              </div>
            </div>

            {/* Search contacts input */}
            <div className="p-2 border-b border-[var(--border)]">
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  width="16"
                  height="16"
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
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search name or username"
                  className="w-full bg-[var(--surface-hover)] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none"
                  autoFocus
                />
              </div>
            </div>

            {/* Contacts Section Header */}
            <div className="px-4 py-3 text-[11px] font-semibold text-[var(--wa-green)] tracking-wider">
              CONTACTS ON BUBI
            </div>

            {/* Contacts List with unread badge support */}
            <div className="flex-1 overflow-y-auto">
              {filteredUsers.length === 0 && (
                <div className="py-12 text-center text-xs text-[var(--text-muted)]">
                  No contacts found
                </div>
              )}
              {filteredUsers.map((u) => {
                const conv = conversations.find((c) =>
                  c.participantIds.includes(u.id),
                )
                const unread = conv ? unreadMap[conv.id] || 0 : 0
                return (
                  <div
                    key={u.id}
                    className="w-full px-4 py-3 hover:bg-[var(--surface-hover)] flex items-center justify-between gap-3 border-b border-[var(--border)]/30 transition group"
                  >
                    <button
                      type="button"
                      onClick={() => void startDirect(u.id)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-[var(--wa-teal)] text-white font-semibold flex items-center justify-center text-base shadow-xs">
                          {u.displayName?.[0]?.toUpperCase() || 'U'}
                        </div>
                        {u.dailyNote && (
                          <span
                            className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--wa-green)] text-white border-2 border-[var(--sidebar-bg)] flex items-center justify-center shadow-xs"
                            title="Has daily note"
                          >
                            <NoteIcon size={8} />
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-sm text-[var(--text)] truncate">
                            {u.displayName}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] truncate">
                            @{u.username}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                          {u.dailyNote ? (
                            <span className="inline-flex items-center gap-1 text-[var(--wa-green)] font-medium">
                              <NoteIcon size={11} className="shrink-0" />
                              <span className="truncate">{u.dailyNote}</span>
                            </span>
                          ) : (
                            u.bio || 'Hey there! I am using BUBI'
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Unread badge on contact if they sent a message */}
                      {unread > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-[var(--wa-green)] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}

                      {/* View Contact Profile Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setViewingContact(u)
                        }}
                        className="p-1.5 rounded-full text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-active)] transition cursor-pointer"
                        title="View contact profile & daily note"
                        aria-label="Contact profile"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </aside>

      {/* ===================== CHAT MAIN, PROFILE PAGE, OR NOTES PAGE ===================== */}
      {sidebarView === 'profile' ? (
        <ProfilePage
          onBackToChats={() => {
            setSidebarView('chats')
            setSidebarOpen(true)
          }}
          onOpenNotesPage={() => {
            setSidebarView('notes')
            setSidebarOpen(false)
          }}
        />
      ) : sidebarView === 'notes' ? (
        <NotesPage
          contacts={users}
          onBackToChats={() => {
            setSidebarView('chats')
            setSidebarOpen(true)
          }}
          onOpenChatWith={(userId) => {
            void startDirect(userId)
            setSidebarView('chats')
          }}
          onViewContactProfile={(c) => setViewingContact(c)}
        />
      ) : (
        <main
          className={`${
            sidebarOpen ? 'hidden md:flex' : 'flex'
          } flex-1 flex-col min-w-0 bg-[var(--bg)] relative wa-chat-bg`}
        >
        {!active ? (
          /* Empty WhatsApp Wallpaper State */
          <div className="flex-1 flex items-center justify-center p-6 text-center select-none">
            <div className="max-w-sm space-y-3 flex flex-col items-center">
              <BubiBrand size={52} className="justify-center" />
              <p className="text-xs text-[var(--text-muted)] leading-relaxed max-w-xs">
                Minimalist pumpkin orange messaging. End-to-end real emojis, contacts, and 10-line daily notes.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(true)
                    setSidebarView('contacts')
                  }}
                  className="px-4 py-2 rounded-full bg-[var(--wa-green)] text-white text-xs font-semibold hover:bg-[var(--wa-green-hover)] transition cursor-pointer shadow-sm"
                >
                  Start a chat
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSidebarView('notes')
                    setSidebarOpen(false)
                  }}
                  className="px-4 py-2 rounded-full bg-[var(--surface-hover)] border border-[var(--border)] text-[var(--text)] text-xs font-semibold hover:bg-[var(--surface-active)] transition cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <NoteIcon size={14} className="text-[var(--wa-green)]" />
                  <span>Daily Notes</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Active Chat Conversation */
          <>
            {/* WhatsApp Header */}
            <header className="px-4 py-2.5 bg-[var(--header-bg)] border-b border-[var(--border)] flex items-center justify-between gap-3 shrink-0 select-none">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile Back to chats */}
                <button
                  type="button"
                  onClick={() => {
                    setSidebarOpen(true)
                    setActiveId(null)
                  }}
                  className="md:hidden p-1.5 -ml-1 text-[var(--text-muted)] hover:text-[var(--text)] rounded-full transition cursor-pointer"
                  aria-label="Back"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>

                {/* Clickable Contact Profile Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    const contact = otherParticipant(active)
                    if (contact) setViewingContact(contact)
                  }}
                  className="flex items-center gap-3 min-w-0 text-left cursor-pointer group"
                  title="View contact profile & daily note"
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--wa-teal)] text-white font-semibold flex items-center justify-center text-sm shadow-xs group-hover:opacity-90 transition">
                      {titleFor(active)[0]?.toUpperCase() || 'C'}
                    </div>
                    {otherParticipant(active)?.dailyNote && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--wa-green)] text-white border-2 border-[var(--header-bg)] flex items-center justify-center shadow-xs"
                        title="Has daily note"
                      >
                        <NoteIcon size={8} />
                      </span>
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-[var(--text)] truncate leading-tight group-hover:text-[var(--wa-green)] transition">
                      {titleFor(active)}
                    </div>
                    <div className="text-[11px] text-[var(--wa-green)] truncate mt-0.5 flex items-center gap-1.5">
                      <span>online</span>
                      {otherParticipant(active)?.dailyNote ? (
                        <>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span className="text-[var(--text-muted)] truncate max-w-[150px] italic">
                            "{otherParticipant(active)?.dailyNote}"
                          </span>
                        </>
                      ) : otherParticipant(active)?.bio ? (
                        <>
                          <span className="text-[var(--text-muted)]">·</span>
                          <span className="text-[var(--text-muted)] truncate max-w-[150px]">
                            {otherParticipant(active)?.bio}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </button>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-1 text-[var(--text-muted)]">
                {/* View Contact Info Button */}
                <button
                  type="button"
                  onClick={() => {
                    const contact = otherParticipant(active)
                    if (contact) setViewingContact(contact)
                  }}
                  className="p-2 rounded-full hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition cursor-pointer"
                  title="View contact info & daily note"
                  aria-label="View contact info"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="16" x2="12" y2="12" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setChatSearchOpen((v) => !v)}
                  className={`p-2 rounded-full hover:bg-[var(--surface-hover)] hover:text-[var(--text)] transition cursor-pointer ${
                    chatSearchOpen ? 'text-[var(--wa-green)]' : ''
                  }`}
                  title="Search in chat"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>
              </div>
            </header>

            {/* In-chat search bar */}
            {chatSearchOpen && (
              <div className="px-4 py-2 bg-[var(--header-bg)] border-b border-[var(--border)] flex items-center gap-2">
                <input
                  type="text"
                  value={chatSearchQuery}
                  onChange={(e) => setChatSearchQuery(e.target.value)}
                  placeholder="Search in this chat…"
                  className="flex-1 bg-[var(--surface-hover)] rounded-lg px-3 py-1.5 text-xs text-[var(--text)] outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    setChatSearchOpen(false)
                    setChatSearchQuery('')
                  }}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1.5">
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
                  !prev || m.createdAt - prev.createdAt > 15 * 60 * 1000

                return (
                  <div key={m.id || m.clientNonce}>
                    {showTime && (
                      <div className="flex justify-center my-3 select-none">
                        <span className="text-[11px] text-[var(--text-muted)] bg-[var(--header-bg)] border border-[var(--border)] px-2.5 py-0.5 rounded-md shadow-xs">
                          {new Date(m.createdAt).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
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
    )}
      </div>

      {/* ===================== PERSISTENT MOBILE BOTTOM NAVIGATION ===================== */}
      {/* Persistently visible across Chats, Notes, Contacts, and Profile on mobile */}
      {/* Hidden only when actively chatting inside a 1-on-1 conversation */}
      {!activeId && (
        <nav className="md:hidden flex items-center justify-around border-t border-[var(--border)] bg-[var(--header-bg)] py-1.5 pb-[calc(6px+var(--safe-bottom))] shrink-0 select-none z-30 shadow-sm">
          {/* Chats Tab with total unread notification badge */}
          <button
            type="button"
            onClick={() => {
              setSidebarView('chats')
              setSidebarOpen(true)
              setActiveId(null)
            }}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition cursor-pointer ${
              sidebarView === 'chats' && !activeId
                ? 'text-[var(--wa-green)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <div className="relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill={sidebarView === 'chats' && !activeId ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[var(--wa-green)] text-white text-[10px] font-bold flex items-center justify-center shadow-xs">
                  {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
                </span>
              )}
            </div>
            <span className="text-[11px]">Chats</span>
          </button>

          {/* Notes Tab with contacts' daily notes count badge */}
          <button
            type="button"
            onClick={() => {
              setSidebarView('notes')
              setSidebarOpen(false)
              setActiveId(null)
            }}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 rounded-xl transition cursor-pointer ${
              sidebarView === 'notes'
                ? 'text-[var(--wa-green)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <div className="relative">
              <svg width="22" height="22" viewBox="0 0 24 24" fill={sidebarView === 'notes' ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              {contactsWithNotesCount > 0 && (
                <span className="absolute -top-1 -right-2 min-w-3.5 h-3.5 px-1 rounded-full bg-amber-400 text-white text-[9px] font-bold flex items-center justify-center">
                  {contactsWithNotesCount}
                </span>
              )}
            </div>
            <span className="text-[11px]">Notes</span>
          </button>

          {/* Contacts Tab */}
          <button
            type="button"
            onClick={() => {
              setSidebarView('contacts')
              setSidebarOpen(true)
              setActiveId(null)
            }}
            className={`flex-1 flex flex-col items-center gap-1 py-1 px-2 rounded-xl transition cursor-pointer ${
              sidebarView === 'contacts' && !activeId
                ? 'text-[var(--wa-green)] font-semibold'
                : 'text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={sidebarView === 'contacts' && !activeId ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span className="text-[11px]">Contacts</span>
          </button>
        </nav>
      )}

      {/* ===================== SETTINGS MODAL ===================== */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onOpenProfile={() => {
            setSidebarView('profile')
            setSidebarOpen(false)
          }}
        />
      )}

      {/* ===================== PROFILE MODAL (USER) ===================== */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}

      {/* ===================== CONTACT PROFILE MODAL ===================== */}
      {viewingContact && (
        <ContactProfileModal
          contact={viewingContact}
          onClose={() => setViewingContact(null)}
          onStartChat={() => {
            void startDirect(viewingContact.id)
            setViewingContact(null)
          }}
        />
      )}
    </div>
  )
}

import { useState, useMemo } from 'react'
import { useAuthStore } from '@/features/auth/store'
import type { UserProfile } from '@/types'
import { BubiLogo } from '@/components/ui/BubiLogo'
import {
  NoteIcon,
  NotesStackIcon,
  PenEditIcon,
  ReplyChatIcon,
  ClockIcon,
  CopyIcon,
  TrashIcon,
  LightbulbIcon,
  UsersCommunityIcon,
} from '@/components/ui/Icons'

interface NotesPageProps {
  contacts: UserProfile[]
  onBackToChats: () => void
  onOpenChatWith: (userId: string) => void
  onViewContactProfile: (contact: UserProfile) => void
}

const QUICK_NOTE_EMOJIS = ['🚀', '☕', '🔥', '✨', '💻', '🎯', '❤️', '📖', '🎧', '⚡']
const INSPIRATION_PROMPTS = [
  'Focusing on new features today 🎯',
  'Deep work mode on · Coffee first ☕',
  'Building something amazing with BUBI 🚀',
  'Learning and exploring new ideas ✨',
]

export function NotesPage({
  contacts,
  onBackToChats,
  onOpenChatWith,
  onViewContactProfile,
}: NotesPageProps) {
  const { user, updateProfile } = useAuthStore()

  const [isEditing, setIsEditing] = useState(!user?.dailyNote)
  const [noteText, setNoteText] = useState(user?.dailyNote || '')
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Enforce 10 lines limit
  const linesCount = useMemo(() => {
    if (!noteText) return 0
    return noteText.split('\n').length
  }, [noteText])

  function handleNoteChange(val: string) {
    const lines = val.split('\n')
    if (lines.length > 10) {
      setNoteText(lines.slice(0, 10).join('\n'))
    } else {
      setNoteText(val)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      const lines = noteText.split('\n')
      if (lines.length >= 10) {
        e.preventDefault()
      }
    }
  }

  function addEmoji(emoji: string) {
    setNoteText((prev) => {
      const next = prev ? `${prev} ${emoji}` : emoji
      const lines = next.split('\n')
      return lines.length <= 10 ? next : prev
    })
  }

  async function handleSaveNote() {
    setSaving(true)
    try {
      await updateProfile({
        dailyNote: noteText.trim(),
      })
      setSavedToast(true)
      setIsEditing(false)
      setTimeout(() => setSavedToast(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  async function handleClearNote() {
    setSaving(true)
    try {
      await updateProfile({ dailyNote: '' })
      setNoteText('')
      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const contactsWithNotes = useMemo(() => {
    return contacts.filter((c) => c.dailyNote && c.dailyNote.trim().length > 0)
  }, [contacts])

  const contactsWithoutNotes = useMemo(() => {
    return contacts.filter((c) => !c.dailyNote || c.dailyNote.trim().length === 0)
  }, [contacts])

  const formattedUserNoteDate = useMemo(() => {
    if (!user?.dailyNoteAt) return null
    try {
      const d = new Date(user.dailyNoteAt)
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return null
    }
  }, [user?.dailyNoteAt])

  function copyNoteText(id: string, text: string) {
    navigator.clipboard?.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1500)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--text)] overflow-y-auto wa-chat-bg">
      {/* Top Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-[var(--header-bg)]/95 backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToChats}
            className="p-1.5 -ml-1 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] rounded-full transition cursor-pointer"
            aria-label="Back to chats"
            title="Back to chats"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <BubiLogo size={28} />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-base leading-tight text-[var(--text)]">Daily Notes</h1>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--wa-green)]" />
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">Short & unique 10-line thoughts alone</p>
            </div>
          </div>
        </div>

        {savedToast && (
          <div className="px-3 py-1 rounded-full bg-[var(--wa-green)] text-white text-xs font-semibold animate-enter shadow-sm flex items-center gap-1.5">
            <NoteIcon size={14} />
            <span>Note Updated!</span>
          </div>
        )}
      </header>

      {/* Main Content Container with mobile bottom nav safe padding */}
      <div className="max-w-2xl w-full mx-auto p-4 sm:p-6 pb-[calc(76px+var(--safe-bottom))] md:pb-6 space-y-6">
        {/* ===================== SECTION 1: YOUR DAILY NOTE ===================== */}
        <section className="bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]/70">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[var(--wa-green)] flex items-center justify-center shrink-0">
                <PenEditIcon size={18} />
              </div>
              <div>
                <h2 className="font-bold text-sm sm:text-base text-[var(--text)]">Your Daily Note</h2>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {user?.dailyNote ? 'Active for today' : 'No note posted yet today'}
                </p>
              </div>
            </div>

            {user?.dailyNote && !isEditing && (
              <button
                type="button"
                onClick={() => {
                  setNoteText(user.dailyNote || '')
                  setIsEditing(true)
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-hover)] text-[var(--wa-green)] hover:bg-[var(--surface-active)] border border-[var(--border)] transition cursor-pointer flex items-center gap-1.5"
              >
                <PenEditIcon size={13} />
                <span>Change Note</span>
              </button>
            )}
          </div>

          {!isEditing && user?.dailyNote ? (
            /* Active Note Display Card */
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 relative shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-[var(--wa-teal)] text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-xs border-2 border-white">
                    {user?.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-[var(--text)]">{user?.displayName}</span>
                      {formattedUserNoteDate && (
                        <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)]">
                          <ClockIcon size={11} />
                          <span>Updated {formattedUserNoteDate}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-[var(--wa-green)] font-semibold mt-0.5">@{user?.username}</div>
                    <div className="mt-2.5 text-xs sm:text-sm text-[var(--text)] leading-relaxed whitespace-pre-line font-medium">
                      {user.dailyNote}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleClearNote}
                  disabled={saving}
                  className="px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <TrashIcon size={13} />
                  <span>Delete note</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-1.5 text-xs font-semibold bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-hover)] rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                >
                  <PenEditIcon size={13} />
                  <span>Edit Note</span>
                </button>
              </div>
            </div>
          ) : (
            /* 10-Lines Note Changing Editor */
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-muted)]">
                  Keep it punchy & unique. Maximum <strong className="text-[var(--text)]">10 lines alone</strong>.
                </span>
                <span
                  className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                    linesCount >= 10
                      ? 'bg-red-500/15 text-red-600'
                      : linesCount > 7
                        ? 'bg-amber-500/15 text-amber-600'
                        : 'bg-[var(--surface-hover)] text-[var(--wa-green)]'
                  }`}
                >
                  {linesCount}/10 lines
                </span>
              </div>

              {/* Textarea Editor */}
              <div className="relative">
                <textarea
                  value={noteText}
                  onChange={(e) => handleNoteChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={5}
                  maxLength={360}
                  placeholder={`Write your daily note here (10 lines max)...\nExample:\n• Deep work mode\n• Shipping BUBI v2.0\n• Coffee & focus`}
                  className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--wa-green)] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed text-[var(--text)] placeholder-[var(--text-muted)] outline-none resize-none transition shadow-inner"
                  autoFocus={isEditing}
                />
                <div className="absolute right-3 bottom-3 text-[10px] text-[var(--text-muted)] select-none">
                  {noteText.length}/360
                </div>
              </div>

              {/* Quick Emojis Bar */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5">
                <span className="text-[11px] text-[var(--text-muted)] shrink-0 mr-1">Insert:</span>
                {QUICK_NOTE_EMOJIS.map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => addEmoji(em)}
                    className="w-7 h-7 rounded-lg hover:bg-[var(--surface-hover)] text-sm flex items-center justify-center transition cursor-pointer shrink-0"
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* Inspiration pills */}
              {!noteText && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-semibold">
                    <LightbulbIcon size={12} className="text-[var(--wa-green)]" />
                    <span>Quick suggestions:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {INSPIRATION_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setNoteText(prompt)}
                        className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text)] border border-[var(--border)] transition cursor-pointer"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Save & Cancel Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                {user?.dailyNote && (
                  <button
                    type="button"
                    onClick={() => {
                      setNoteText(user.dailyNote || '')
                      setIsEditing(false)
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition cursor-pointer"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving || !noteText.trim()}
                  onClick={handleSaveNote}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-hover)] transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <PenEditIcon size={14} />
                  <span>{saving ? 'Publishing…' : 'Publish Daily Note'}</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ===================== SECTION 2: CONTACTS' DAILY NOTES ===================== */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[var(--wa-green)] flex items-center justify-center shrink-0">
                <NotesStackIcon size={16} />
              </div>
              <h2 className="font-bold text-sm sm:text-base text-[var(--text)]">
                Contacts' Notes ({contactsWithNotes.length})
              </h2>
            </div>
            <span className="text-[11px] text-[var(--text-muted)]">Shared today</span>
          </div>

          {/* Bubble Row of Active Notes */}
          {contactsWithNotes.length > 0 && (
            <div className="flex gap-4 overflow-x-auto pb-3 pt-4 px-1 scrollbar-none">
              {contactsWithNotes.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onViewContactProfile(c)}
                  className="flex flex-col items-center gap-1 shrink-0 cursor-pointer group"
                >
                  <div className="relative">
                    {/* Small preview note bubble above avatar */}
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[var(--header-bg)] border border-[var(--wa-green)] px-2 py-0.5 rounded-full shadow-xs text-[10px] text-[var(--text)] font-semibold truncate max-w-[85px] z-10 flex items-center gap-1">
                      <NoteIcon size={10} className="text-[var(--wa-green)] shrink-0" />
                      <span className="truncate">{c.dailyNote?.split('\n')[0]}</span>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-[var(--wa-teal)] text-white font-bold text-lg flex items-center justify-center shadow-md border-2 border-white group-hover:scale-105 transition-transform">
                      {c.displayName[0]?.toUpperCase() || 'U'}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-[var(--text)] truncate max-w-[70px] mt-1">
                    {c.displayName.split(' ')[0]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Detailed Cards for Each Contact's Note */}
          <div className="space-y-3">
            {contactsWithNotes.map((c) => {
              const formattedDate = c.dailyNoteAt
                ? new Date(c.dailyNoteAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                : 'Today'

              return (
                <div
                  key={c.id}
                  className="p-4 sm:p-5 rounded-3xl bg-[var(--header-bg)] border border-[var(--border)] shadow-xs space-y-3 hover:border-[var(--wa-green)]/40 transition"
                >
                  {/* Contact Header */}
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onViewContactProfile(c)}
                      className="flex items-center gap-3 text-left cursor-pointer group"
                    >
                      <div className="w-11 h-11 rounded-full bg-[var(--wa-teal)] text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0 group-hover:opacity-90 transition">
                        {c.displayName[0]?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-[var(--text)] group-hover:text-[var(--wa-green)] transition truncate">
                          {c.displayName}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] truncate">
                          @{c.username}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] shrink-0">
                      <ClockIcon size={11} />
                      <span>{formattedDate}</span>
                    </div>
                  </div>

                  {/* Note Body (10 lines max preserved) */}
                  <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-[var(--text)] leading-relaxed whitespace-pre-line font-medium">
                    {c.dailyNote}
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => copyNoteText(c.id, c.dailyNote || '')}
                      className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CopyIcon size={13} />
                      <span>{copiedId === c.id ? '✓ Copied' : 'Copy note'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onOpenChatWith(c.id)}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-hover)] transition cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      <ReplyChatIcon size={14} />
                      <span>Reply in Chat</span>
                    </button>
                  </div>
                </div>
              )
            })}

            {contactsWithNotes.length === 0 && (
              <div className="p-8 text-center bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[var(--wa-green)] flex items-center justify-center mx-auto mb-2">
                  <NotesStackIcon size={24} />
                </div>
                <h3 className="font-semibold text-sm text-[var(--text)]">No notes shared yet today</h3>
                <p className="text-xs text-[var(--text-muted)] max-w-xs mx-auto">
                  When your contacts update their daily 10-line note, their thoughts will appear here in real-time.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ===================== SECTION 3: OTHER CONTACTS & BIOS ===================== */}
        {contactsWithoutNotes.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              <UsersCommunityIcon size={15} />
              <span>Other Contacts on BUBI ({contactsWithoutNotes.length})</span>
            </div>
            <div className="bg-[var(--header-bg)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]/40 overflow-hidden">
              {contactsWithoutNotes.map((c) => (
                <div
                  key={c.id}
                  className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--surface-hover)] transition"
                >
                  <button
                    type="button"
                    onClick={() => onViewContactProfile(c)}
                    className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-[var(--wa-teal)] text-white font-semibold text-sm flex items-center justify-center shrink-0 shadow-xs">
                      {c.displayName[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs sm:text-sm text-[var(--text)] truncate">
                        {c.displayName}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] truncate">
                        {c.bio || `@${c.username}`}
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenChatWith(c.id)}
                    className="px-3 py-1 rounded-lg text-xs font-medium text-[var(--wa-green)] hover:bg-[var(--surface-active)] transition cursor-pointer shrink-0 flex items-center gap-1"
                  >
                    <ReplyChatIcon size={12} />
                    <span>Chat</span>
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

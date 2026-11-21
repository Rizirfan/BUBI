import { useState } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { BubiLogo } from '@/components/ui/BubiLogo'
import {
  PenEditIcon,
  NoteIcon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
} from '@/components/ui/Icons'

interface ProfilePageProps {
  onBackToChats: () => void
  onOpenNotesPage: () => void
}

const AVATAR_COLORS = [
  { name: 'Pumpkin Orange', bg: 'bg-[#EA580C]', hex: '#EA580C' },
  { name: 'Warm Amber', bg: 'bg-[#D97706]', hex: '#D97706' },
  { name: 'Forest Teal', bg: 'bg-[#0D9488]', hex: '#0D9488' },
  { name: 'Deep Indigo', bg: 'bg-[#4F46E5]', hex: '#4F46E5' },
  { name: 'Rose Coral', bg: 'bg-[#E11D48]', hex: '#E11D48' },
  { name: 'Dark Slate', bg: 'bg-[#18181B]', hex: '#18181B' },
]

const IDENTITY_SUGGESTIONS = [
  'Designing & Building with high craft 🚀',
  'Available for real-time chat ✨',
  'Deep work mode · Coffee first ☕',
  'Minimalist coder & creative mind 💻',
  'Exploring new ideas every day 🎯',
]

export function ProfilePage({
  onBackToChats,
  onOpenNotesPage,
}: ProfilePageProps) {
  const { user, updateProfile, logout } = useAuthStore()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || 'Hey there! I am using BUBI')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#EA580C')
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)
  const [copiedHandle, setCopiedHandle] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        displayName: displayName.trim() || user?.displayName,
        bio: bio.trim(),
        avatarColor,
      })
      setSavedToast(true)
      setTimeout(() => setSavedToast(false), 2000)
    } finally {
      setSaving(false)
    }
  }

  function handleCopyUsername() {
    if (user?.username) {
      navigator.clipboard?.writeText(`@${user.username}`)
      setCopiedHandle(true)
      setTimeout(() => setCopiedHandle(false), 1500)
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] text-[var(--text)] overflow-y-auto wa-chat-bg">
      {/* Top Sticky Header with safe-area-inset-top */}
      <header className="sticky top-0 z-10 px-4 py-3 pt-[calc(0.75rem+var(--safe-top))] bg-[var(--header-bg)]/95 backdrop-blur-md border-b border-[var(--border)] flex items-center justify-between shadow-xs">
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
              <h1 className="font-bold text-base leading-tight text-[var(--text)]">Your Profile</h1>
              <p className="text-[11px] text-[var(--text-muted)]">BUBI identity and account profile</p>
            </div>
          </div>
        </div>

        {savedToast && (
          <div className="px-3.5 py-1 rounded-full bg-[var(--wa-green)] text-white text-xs font-semibold animate-enter shadow-sm flex items-center gap-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Profile Saved!</span>
          </div>
        )}
      </header>

      {/* Main Profile Canvas with safe bottom nav padding */}
      <div className="max-w-xl w-full mx-auto p-4 sm:p-6 pb-[calc(76px+var(--safe-bottom))] md:pb-6 space-y-6">
        {/* ===================== HERO PROFILE CARD ===================== */}
        <section className="bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-sm space-y-5 flex flex-col items-center text-center relative overflow-hidden">
          {/* Subtle warm decorative top glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b from-orange-500/10 to-transparent blur-xl pointer-events-none" />

          {/* Avatar with custom color */}
          <div className="relative group">
            <div
              style={{ backgroundColor: avatarColor }}
              className="w-24 h-24 rounded-full text-white font-extrabold text-3xl flex items-center justify-center shadow-lg border-4 border-[var(--surface)] transition-all"
            >
              {displayName[0]?.toUpperCase() || user?.username[0]?.toUpperCase() || 'U'}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1.5">
              <h2 className="font-extrabold text-xl text-[var(--text)] tracking-tight">
                {displayName || user?.displayName}
              </h2>
              <span className="w-4 h-4 rounded-full bg-[var(--wa-green)] text-white text-[9px] font-bold flex items-center justify-center shadow-xs" title="Verified on BUBI">
                ✓
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyUsername}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--wa-green)] hover:opacity-85 transition cursor-pointer"
              title="Copy username"
            >
              <span>@{user?.username}</span>
              <CopyIcon size={12} className="text-[var(--wa-green)]" />
              {copiedHandle && <span className="text-[10px] text-zinc-500">· Copied!</span>}
            </button>
          </div>

          {/* Avatar Color Picker */}
          <div className="pt-1">
            <div className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              Theme Accent Color
            </div>
            <div className="flex items-center justify-center gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setAvatarColor(c.hex)}
                  style={{ backgroundColor: c.hex }}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer shadow-xs ${
                    avatarColor === c.hex ? 'scale-125 ring-2 ring-offset-2 ring-[var(--wa-green)]' : 'hover:scale-110 opacity-80'
                  }`}
                  title={c.name}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ===================== IDENTITY & BIO ===================== */}
        <section className="bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                Identity & Bio
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">{bio.length}/160</span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              This statement defines your identity and is visible to all contacts on BUBI.
            </p>
          </div>

          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            rows={3}
            placeholder="Express your identity (e.g. Designer & Coder 🚀)"
            className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--wa-green)] rounded-2xl p-3.5 text-xs sm:text-sm text-[var(--text)] outline-none resize-none transition shadow-inner"
          />

          {/* Quick Suggestion Pills */}
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Ideas for your identity:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {IDENTITY_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setBio(sug)}
                  className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--surface-hover)] hover:bg-[var(--surface-active)] text-[var(--text)] border border-[var(--border)] transition cursor-pointer"
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ===================== DISPLAY NAME ===================== */}
        <section className="bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
              Display Name
            </label>
            <p className="text-[11px] text-[var(--text-muted)]">
              Your name as it appears in conversation headers and contacts list.
            </p>
          </div>

          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="Your Name"
            className="w-full bg-[var(--input-bg)] border border-[var(--border)] focus:border-[var(--wa-green)] rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-[var(--text)] outline-none transition"
          />
        </section>

        {/* ===================== DAILY NOTE STATUS & SHORTCUT ===================== */}
        <section className="bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl p-5 sm:p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[var(--wa-green)] flex items-center justify-center shrink-0">
                <NoteIcon size={16} />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--text)]">Daily Note</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {user?.dailyNote ? '10-line note active today' : 'No note shared today'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenNotesPage}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[var(--surface-hover)] text-[var(--wa-green)] hover:bg-[var(--surface-active)] border border-[var(--border)] transition cursor-pointer flex items-center gap-1.5"
            >
              <PenEditIcon size={12} />
              <span>Go to Notes Page</span>
            </button>
          </div>

          {user?.dailyNote ? (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs sm:text-sm text-[var(--text)] leading-relaxed whitespace-pre-line font-medium">
              {user.dailyNote}
            </div>
          ) : (
            <p className="text-xs text-[var(--text-muted)] italic">
              You haven't written a 10-line daily note today. Update it anytime on the Notes Page.
            </p>
          )}
        </section>

        {/* ===================== ACTIONS ===================== */}
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={logout}
            className="px-4 py-2 text-xs font-semibold text-red-500 hover:bg-red-500/10 rounded-xl transition cursor-pointer"
          >
            Sign Out
          </button>

          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-hover)] transition cursor-pointer shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            <span>{saving ? 'Saving Profile…' : 'Save Profile'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

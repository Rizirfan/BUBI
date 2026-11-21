import { useState, useMemo } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { BubiLogo } from '@/components/ui/BubiLogo'

interface ProfileModalProps {
  onClose: () => void
}

export function ProfileModal({ onClose }: ProfileModalProps) {
  const { user, updateProfile } = useAuthStore()

  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [bio, setBio] = useState(user?.bio || 'Hey there! I am using BUBI')
  const [dailyNote, setDailyNote] = useState(user?.dailyNote || '')
  const [saving, setSaving] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  // Enforce 10 lines max for the daily note
  const linesCount = useMemo(() => {
    if (!dailyNote) return 0
    return dailyNote.split('\n').length
  }, [dailyNote])

  function handleDailyNoteChange(val: string) {
    const lines = val.split('\n')
    if (lines.length > 10) {
      // Keep only first 10 lines
      setDailyNote(lines.slice(0, 10).join('\n'))
    } else {
      setDailyNote(val)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter') {
      const lines = dailyNote.split('\n')
      if (lines.length >= 10) {
        e.preventDefault()
      }
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await updateProfile({
        displayName: displayName.trim() || user?.displayName,
        bio: bio.trim(),
        dailyNote: dailyNote.trim(),
      })
      setSavedToast(true)
      setTimeout(() => {
        setSavedToast(false)
        onClose()
      }, 700)
    } finally {
      setSaving(false)
    }
  }

  const formattedNoteDate = useMemo(() => {
    if (!user?.dailyNoteAt) return null
    try {
      const d = new Date(user.dailyNoteAt)
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return null
    }
  }, [user?.dailyNoteAt])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-enter">
      <div className="w-full max-w-md bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-5 text-[var(--text)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <BubiLogo size={28} />
            <h2 className="text-base font-bold">Your Profile & Daily Note</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Avatar & Identity Banner */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)]/60 relative">
          <div className="w-18 h-18 rounded-full bg-[var(--wa-teal)] text-white font-bold text-2xl flex items-center justify-center shadow-md border-2 border-white">
            {displayName[0]?.toUpperCase() || user?.username[0]?.toUpperCase() || 'U'}
          </div>
          <h3 className="font-bold text-base mt-2.5 text-[var(--text)]">{displayName || user?.displayName}</h3>
          <p className="text-xs text-[var(--wa-green)] font-semibold mt-0.5">@{user?.username}</p>
        </div>

        {/* Display Name Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={50}
            placeholder="Your name"
            className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--wa-green)] transition"
          />
        </div>

        {/* Identity Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
              Identity & Bio
            </label>
            <span className="text-[11px] text-[var(--text-muted)]">{bio.length}/160</span>
          </div>
          <input
            type="text"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={160}
            placeholder="Express your identity (e.g. Designer & Coder 🚀)"
            className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-xl px-3.5 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--wa-green)] transition"
          />
          <p className="text-[11px] text-[var(--text-muted)]">
            This identity is shown on your contact card and profile.
          </p>
        </div>

        {/* Daily Note (10 Lines Max) */}
        <div className="space-y-2 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">📝</span>
              <label className="text-xs font-bold text-[var(--wa-green)] uppercase tracking-wider">
                Today's Daily Note
              </label>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                  linesCount === 10
                    ? 'bg-red-500/10 text-red-500'
                    : 'bg-[var(--surface-hover)] text-[var(--wa-green)]'
                }`}
              >
                {linesCount}/10 lines
              </span>
            </div>
          </div>

          <textarea
            value={dailyNote}
            onChange={(e) => handleDailyNoteChange(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            maxLength={360}
            placeholder="Share a short daily thought or status with your contacts (max 10 lines alone)..."
            className="w-full bg-[var(--header-bg)] border border-[var(--border)] rounded-xl p-3 text-xs leading-relaxed text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--wa-green)] resize-none transition"
          />

          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>Short & unique update for today.</span>
            {formattedNoteDate && <span>Last updated: {formattedNoteDate}</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-hover)] transition cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-60"
          >
            {saving ? 'Saving…' : savedToast ? '✓ Saved!' : 'Save Profile'}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useMemo } from 'react'
import type { UserProfile } from '@/types'
import { BubiLogo } from '@/components/ui/BubiLogo'

interface ContactProfileModalProps {
  contact: UserProfile
  onClose: () => void
  onStartChat?: () => void
}

export function ContactProfileModal({
  contact,
  onClose,
  onStartChat,
}: ContactProfileModalProps) {
  const [copied, setCopied] = useState(false)

  const formattedNoteDate = useMemo(() => {
    if (!contact.dailyNoteAt) return null
    try {
      const d = new Date(contact.dailyNoteAt)
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    } catch {
      return null
    }
  }, [contact.dailyNoteAt])

  function handleCopyUsername() {
    navigator.clipboard?.writeText(`@${contact.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-enter">
      <div className="w-full max-w-sm bg-[var(--header-bg)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl space-y-5 text-[var(--text)] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <BubiLogo size={26} />
            <h2 className="text-base font-bold">Contact Info</h2>
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

        {/* Contact Banner */}
        <div className="flex flex-col items-center text-center p-4 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)]/60">
          <div className="w-20 h-20 rounded-full bg-[var(--wa-teal)] text-white font-bold text-3xl flex items-center justify-center shadow-md border-2 border-white">
            {contact.displayName[0]?.toUpperCase() || contact.username[0]?.toUpperCase() || 'U'}
          </div>
          <h3 className="font-bold text-lg mt-3 text-[var(--text)]">{contact.displayName}</h3>
          <p className="text-xs text-[var(--wa-green)] font-semibold mt-0.5">@{contact.username}</p>
        </div>

        {/* Identity & Bio */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
            Identity / Bio
          </div>
          <div className="p-3 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]/60 text-xs text-[var(--text)] leading-relaxed">
            {contact.bio || 'Hey there! I am using BUBI'}
          </div>
        </div>

        {/* Daily Note (10 Lines Max) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--wa-green)] uppercase tracking-wider">
              <span>📝</span>
              <span>Today's Daily Note</span>
            </div>
            {formattedNoteDate && (
              <span className="text-[10px] text-[var(--text-muted)]">{formattedNoteDate}</span>
            )}
          </div>

          {contact.dailyNote ? (
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-[var(--text)] leading-relaxed whitespace-pre-line font-medium shadow-xs">
              {contact.dailyNote}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-[var(--surface-hover)] border border-dashed border-[var(--border)] text-xs text-[var(--text-muted)] italic text-center">
              No daily note shared today.
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="pt-2 flex flex-col gap-2">
          {onStartChat && (
            <button
              type="button"
              onClick={() => {
                onStartChat()
                onClose()
              }}
              className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[var(--wa-green)] text-white hover:bg-[var(--wa-green-hover)] transition cursor-pointer shadow-sm flex items-center justify-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span>Message {contact.displayName.split(' ')[0]}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyUsername}
            className="w-full py-2 rounded-xl text-xs font-medium text-[var(--text-muted)] hover:bg-[var(--surface-hover)] border border-[var(--border)] transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            {copied ? '✓ Username Copied' : 'Copy Username'}
          </button>
        </div>
      </div>
    </div>
  )
}

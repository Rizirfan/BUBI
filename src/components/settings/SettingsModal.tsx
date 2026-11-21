import { useState } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useSettingsStore } from '@/features/settings/store'
import { db } from '@/db/client'

export function SettingsModal({
  onClose,
  onOpenProfile,
}: {
  onClose: () => void
  onOpenProfile?: () => void
}) {
  const { user, logout } = useAuthStore()
  const { theme, setTheme, sendOnEnter, setSendOnEnter, soundEnabled, setSoundEnabled } = useSettingsStore()
  const [cleared, setCleared] = useState(false)

  async function clearLocalCache() {
    try {
      await db.messages.clear()
      await db.reactions.clear()
      await db.conversations.clear()
      setCleared(true)
      setTimeout(() => {
        window.location.reload()
      }, 600)
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-enter">
      <div className="w-full max-w-sm bg-[var(--header-bg)] border border-[var(--border)] rounded-2xl p-5 shadow-2xl space-y-5 text-[var(--text)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* User Profile Info Card */}
        <button
          type="button"
          onClick={() => {
            onClose()
            onOpenProfile?.()
          }}
          className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-[var(--surface-hover)] border border-[var(--border)] hover:border-[var(--wa-green)] transition text-left cursor-pointer group shadow-xs"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-full bg-[var(--wa-teal)] flex items-center justify-center text-white font-semibold text-base shrink-0 shadow-xs">
              {user?.displayName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate text-[var(--text)]">{user?.displayName}</div>
              <div className="text-xs text-[var(--wa-green)] font-medium truncate">@{user?.username}</div>
              {user?.bio && (
                <div className="text-[11px] text-[var(--text-muted)] truncate mt-0.5">{user.bio}</div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-[var(--wa-green)] shrink-0 ml-2 group-hover:translate-x-0.5 transition-transform">
            <span>Edit Profile</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </button>

        {/* Setting Options */}
        <div className="space-y-4 text-sm">
          {/* Theme */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Theme</div>
              <div className="text-xs text-[var(--text-muted)]">Choose interface mode</div>
            </div>
            <div className="flex bg-[var(--surface-hover)] rounded-lg p-0.5 border border-[var(--border)]">
              <button
                onClick={() => setTheme('dark')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                  theme === 'dark' ? 'bg-[var(--wa-green)] text-white' : 'text-[var(--text-muted)]'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition cursor-pointer ${
                  theme === 'light' ? 'bg-[var(--wa-green)] text-white' : 'text-[var(--text-muted)]'
                }`}
              >
                Light
              </button>
            </div>
          </div>

          {/* Send on Enter */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Press Enter to send</div>
              <div className="text-xs text-[var(--text-muted)]">
                {sendOnEnter ? 'Enter sends message' : 'Shift+Enter sends message'}
              </div>
            </div>
            <button
              onClick={() => setSendOnEnter(!sendOnEnter)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                sendOnEnter ? 'bg-[var(--wa-green)]' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  sendOnEnter ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Notification Sounds */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Notification sounds</div>
              <div className="text-xs text-[var(--text-muted)]">Play chime for incoming messages</div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                soundEnabled ? 'bg-[var(--wa-green)]' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  soundEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Clear Cache */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]">
            <div>
              <div className="font-medium">Local storage cache</div>
              <div className="text-xs text-[var(--text-muted)]">Reset offline message cache</div>
            </div>
            <button
              onClick={clearLocalCache}
              disabled={cleared}
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-400/40 transition cursor-pointer"
            >
              {cleared ? 'Cleared!' : 'Clear Cache'}
            </button>
          </div>
        </div>

        {/* Footer / Sign Out */}
        <div className="pt-2 border-t border-[var(--border)]">
          <button
            onClick={() => {
              logout()
              onClose()
            }}
            className="w-full py-2 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/10 transition cursor-pointer"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}

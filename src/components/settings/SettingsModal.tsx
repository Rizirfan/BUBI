import { useState } from 'react'
import { useAuthStore } from '@/features/auth/store'
import { useSettingsStore } from '@/features/settings/store'
import { db } from '@/db/client'

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuthStore()
  const { theme, setTheme, sendOnEnter, setSendOnEnter } = useSettingsStore()
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-enter">
      <div className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5 shadow-xl space-y-5 text-[var(--text)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
          <h2 className="text-base font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
          >
            ✕
          </button>
        </div>

        {/* User Profile Info */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface-hover)]">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
            {user?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-sm truncate">{user?.displayName}</div>
            <div className="text-xs text-[var(--text-muted)]">@{user?.username}</div>
          </div>
        </div>

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
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  theme === 'dark' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)]'
                }`}
              >
                Dark
              </button>
              <button
                onClick={() => setTheme('light')}
                className={`px-3 py-1 text-xs rounded-md font-medium transition ${
                  theme === 'light' ? 'bg-blue-600 text-white' : 'text-[var(--text-muted)]'
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
              className={`w-11 h-6 rounded-full transition-colors relative ${
                sendOnEnter ? 'bg-blue-600' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  sendOnEnter ? 'translate-x-6' : 'translate-x-1'
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
              className="px-3 py-1.5 text-xs rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:text-red-400 hover:border-red-400/40 transition"
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
            className="w-full py-2 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}

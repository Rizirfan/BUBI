import { useState } from 'react'
import { useAuthStore } from './store'
import { BubiLogo, BubiBrand } from '@/components/ui/BubiLogo'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuthStore()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      let u = username.trim().replace(/^@+/, '')
      let d = displayName.trim().replace(/^@+/, '')

      if (mode === 'login') {
        await login(u, password)
      } else {
        // If user put full name (with spaces) in username and handle in displayName:
        if (u.includes(' ') && !d.includes(' ')) {
          const temp = u
          u = d
          d = temp
        } else if (u.includes(' ')) {
          // If username has spaces, replace spaces with underscores
          u = u.replace(/\s+/g, '_')
        }
        if (!d) d = u
        await register(u, d, password)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-4">
      <div className="w-full max-w-xs relative z-10 animate-enter">
        <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-lg p-6">
          {/* Brand Logo Header */}
          <div className="flex flex-col items-center justify-center mb-5">
            <BubiBrand size={42} className="justify-center mb-1" />
            <p className="text-[11px] text-[var(--text-muted)] font-medium">Simple, minimal messaging</p>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[var(--surface-hover)] rounded-xl p-1 mb-4 border border-[var(--border)]">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                mode === 'login'
                  ? 'bg-[var(--wa-green)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register')
                setError(null)
              }}
              className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                mode === 'register'
                  ? 'bg-[var(--wa-green)] text-white shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text)]'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-3">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={1}
                  maxLength={50}
                  placeholder="e.g. Mohamed Irfan"
                  className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--wa-green)] transition"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  {mode === 'register' ? 'Username Handle' : 'Username'}
                </label>
                {mode === 'register' && (
                  <span className="text-[10px] text-[var(--text-muted)]">no spaces</span>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium select-none">
                  @
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/^@+/, ''))}
                  required
                  minLength={3}
                  maxLength={32}
                  autoComplete="username"
                  autoCapitalize="none"
                  placeholder={mode === 'register' ? 'mohd_irfan' : 'username'}
                  className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl pl-7 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--wa-green)] transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-[var(--text-muted)]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[10px] text-[var(--wa-green)] hover:opacity-80 cursor-pointer font-medium"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="••••••••"
                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--wa-green)] transition"
              />
            </div>

            {error && (
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-xs text-white bg-[var(--wa-green)] hover:bg-[var(--wa-green-hover)] active:scale-[0.98] transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

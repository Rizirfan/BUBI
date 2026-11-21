import { useState, useMemo } from 'react'
import { useAuthStore } from './store'
import { BubiLogo, BubiBrand } from '@/components/ui/BubiLogo'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [name, setName] = useState('')
  const [customHandle, setCustomHandle] = useState('')
  const [showCustomHandle, setShowCustomHandle] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuthStore()

  // Auto-assigned username handle from name, with default @bubi fallback
  const autoHandle = useMemo(() => {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
    return slug || 'bubi'
  }, [name])

  const effectiveHandle = showCustomHandle && customHandle.trim()
    ? customHandle.trim().replace(/^@+/, '')
    : autoHandle

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') {
        const identifier = name.trim().replace(/^@+/, '')
        await login(identifier, password)
      } else {
        const displayName = name.trim() || 'BUBI User'
        const username = effectiveHandle
        await register(username, displayName, password)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-[var(--bg)] text-[var(--text)] flex items-center justify-center p-4 pt-[calc(1rem+var(--safe-top))] pb-[calc(1rem+var(--safe-bottom))]">
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
          <form onSubmit={submit} className="space-y-3.5">
            {/* Name Input */}
            <div>
              <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                {mode === 'register' ? 'Your Name' : 'Your Name or Handle'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={50}
                autoFocus
                placeholder={mode === 'register' ? 'e.g. Mohamed Irfan' : 'e.g. Mohamed Irfan or @bubi'}
                className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--wa-green)] transition"
              />

              {/* In register mode, show assigned @bubi handle indicator */}
              {mode === 'register' && (
                <div className="mt-1.5 flex items-center justify-between text-[11px] px-1">
                  <span className="text-[var(--text-muted)]">Assigned handle:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-[var(--wa-green)]">
                      @{effectiveHandle}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCustomHandle((v) => !v)}
                      className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text)] underline cursor-pointer"
                    >
                      {showCustomHandle ? 'auto' : 'customize'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Optional Custom Handle override */}
            {mode === 'register' && showCustomHandle && (
              <div className="animate-enter">
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  Custom Handle
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-medium select-none">
                    @
                  </span>
                  <input
                    type="text"
                    value={customHandle}
                    onChange={(e) => setCustomHandle(e.target.value.replace(/^@+/, ''))}
                    placeholder={autoHandle}
                    className="w-full bg-[var(--surface-hover)] border border-[var(--border)] rounded-xl pl-7 pr-3 py-2 text-xs text-[var(--text)] placeholder-[var(--text-muted)] outline-none focus:border-[var(--wa-green)] transition"
                  />
                </div>
              </div>
            )}

            {/* Password */}
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
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs leading-relaxed">
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

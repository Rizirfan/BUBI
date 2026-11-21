import { useState } from 'react'
import { useAuthStore } from './store'

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
      if (mode === 'login') {
        await login(username.trim(), password)
      } else {
        await register(username.trim(), displayName.trim(), password)
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-4">
      {/* Background ambient light */}
      <div className="fixed top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] rounded-full bg-indigo-600/10 blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 animate-enter">
        <div className="bg-[#12131c]/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-7">
          {/* App Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-13 h-13 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-2xl shadow-lg shadow-indigo-500/25 mb-3">
              B
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              BUBI
            </h1>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setMode('login')
                setError(null)
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
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
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={32}
                autoComplete="username"
                autoCapitalize="none"
                placeholder="Username"
                className="w-full bg-[#181924] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            {mode === 'register' && (
              <div className="animate-enter">
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  minLength={1}
                  maxLength={50}
                  placeholder="Display Name"
                  className="w-full bg-[#181924] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-[11px] text-zinc-400 hover:text-zinc-200 transition"
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
                placeholder="Password"
                className="w-full bg-[#181924] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-enter">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {busy ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Please wait…</span>
                </>
              ) : mode === 'login' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

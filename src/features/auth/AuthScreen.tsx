import { useState } from 'react'
import { useAuthStore } from './store'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuthStore()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (mode === 'login') await login(username.trim(), password)
      else await register(username.trim(), displayName.trim(), password)
    } catch (err: any) {
      setError(err.message || 'Something went wrong')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center bg-[var(--bg)] px-4 py-10">
      <div className="w-full max-w-md bg-white/90 backdrop-blur rounded-3xl shadow-sm border border-black/5 p-6">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-[var(--blue)] text-white flex items-center justify-center text-xl font-bold">B</div>
          <h1 className="text-2xl font-semibold tracking-tight">BUBI</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Text, reactions, and custom emojis.</p>
        </div>

        <div className="flex bg-[var(--surface-2)] rounded-xl p-1 mb-5">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${mode === m ? 'bg-white shadow-sm' : 'text-[var(--muted)]'}`}>
              {m === 'login' ? 'Sign in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Username</span>
            <input value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={32}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-[var(--blue)]/30" placeholder="yourname" />
          </label>
          {mode === 'register' && (
            <label className="block">
              <span className="text-sm text-[var(--muted)]">Display name</span>
              <input value={displayName} onChange={e => setDisplayName(e.target.value)} required minLength={1} maxLength={50}
                className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-[var(--blue)]/30" placeholder="Your Name" />
            </label>
          )}
          <label className="block">
            <span className="text-sm text-[var(--muted)]">Password</span>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
              className="mt-1 w-full rounded-xl border border-black/10 px-3 py-2.5 bg-white outline-none focus:ring-2 focus:ring-[var(--blue)]/30" placeholder="••••••••" />
          </label>
          {error && <div className="text-sm text-[var(--danger)] bg-red-50 rounded-xl px-3 py-2">{error}</div>}
          <button disabled={busy} type="submit"
            className="w-full rounded-xl bg-[var(--blue)] text-white py-2.5 font-medium disabled:opacity-60 hover:bg-[var(--blue-pressed)] transition">
            {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}

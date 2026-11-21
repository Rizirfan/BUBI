import { useState } from 'react'
import { useAuthStore } from './store'
import { EMOJI_MAP } from '@/features/emojis/emoji'

export function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const { login, register } = useAuthStore()

  // Interactive demo reactions state for the showcase mockup
  const [demoReactions, setDemoReactions] = useState<Record<string, number>>({
    spark: 4,
    bloom: 2,
    bolt: 6,
  })

  function toggleDemoReaction(id: string) {
    setDemoReactions((prev) => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }))
  }

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
    <div className="min-h-full bg-[#09090b] text-[#f4f4f5] flex items-center justify-center p-4 sm:p-6 lg:p-10 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10 my-auto">
        {/* Left Column: Product Showcase & Vision */}
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6 text-left">
          {/* Brand Tagline */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="text-xs font-medium text-zinc-300">
              The Pure Vector Messenger
            </span>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-[1.15]">
              Pure words. <br />
              <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">
                Vector emotions.
              </span>
            </h1>
            <p className="text-base text-zinc-400 max-w-xl leading-relaxed">
              BUBI is built for direct, distraction-free messaging. Zero algorithmic feeds, no video bloat, no surveillance. Just instant text, bespoke hand-crafted vector emojis, and local-first persistence.
            </p>
          </div>

          {/* Interactive Live Product Preview */}
          <div className="rounded-2xl bg-[#12131b]/90 border border-white/10 p-4 shadow-xl backdrop-blur-md max-w-lg space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs font-semibold text-zinc-300">Live Vector Canvas</span>
              </div>
              <span className="text-[11px] text-zinc-500">Interactive Preview</span>
            </div>

            {/* Simulated message 1 */}
            <div className="flex justify-start">
              <div className="bg-[#181924] border border-white/8 rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-zinc-200 space-y-1">
                <div className="text-[10px] text-indigo-400 font-semibold">Maya</div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Launching BUBI today</span>
                  <span
                    className="w-4 h-4 inline-block align-middle"
                    dangerouslySetInnerHTML={{ __html: EMOJI_MAP['spark']?.svg || '' }}
                  />
                  <span
                    className="w-4 h-4 inline-block align-middle"
                    dangerouslySetInnerHTML={{ __html: EMOJI_MAP['bolt']?.svg || '' }}
                  />
                </div>
              </div>
            </div>

            {/* Simulated message 2 */}
            <div className="flex justify-end">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl rounded-br-sm px-3.5 py-2 text-xs text-white space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span>Zero bloat. Instant sync feels incredible</span>
                  <span
                    className="w-4 h-4 inline-block align-middle"
                    dangerouslySetInnerHTML={{ __html: EMOJI_MAP['bloom']?.svg || '' }}
                  />
                </div>
              </div>
            </div>

            {/* Simulated interactive reactions */}
            <div className="flex items-center justify-end gap-1.5 pt-1">
              <span className="text-[10px] text-zinc-500 mr-1">Tap to react:</span>
              {Object.entries(demoReactions).map(([id, count]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleDemoReaction(id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                  title="Click to react"
                >
                  <span
                    className="w-3.5 h-3.5 inline-block"
                    dangerouslySetInnerHTML={{ __html: EMOJI_MAP[id]?.svg || '' }}
                  />
                  <span className="text-[11px] font-medium">{count}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Value Pillars */}
          <div className="grid grid-cols-3 gap-3 max-w-lg pt-1">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-xs font-semibold text-zinc-200">0ms Local</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">IndexedDB local store</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-xs font-semibold text-zinc-200">100% Vector</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Custom SVG emojis</div>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <div className="text-xs font-semibold text-zinc-200">Real-Time</div>
              <div className="text-[11px] text-zinc-500 mt-0.5">Socket.IO streaming</div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In / Registration Form */}
        <div className="lg:col-span-5">
          <div className="w-full bg-[#11121a]/90 backdrop-blur-2xl rounded-3xl border border-white/10 shadow-2xl p-6 sm:p-8 relative">
            {/* Logo & Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white font-black text-2xl shadow-lg shadow-indigo-500/25 mb-3">
                B
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                {mode === 'login' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                {mode === 'login'
                  ? 'Sign in to access your real-time conversations'
                  : 'Get your unique handle and start chatting'}
              </p>
            </div>

            {/* Switch Tabs */}
            <div className="flex bg-white/5 border border-white/5 rounded-xl p-1 mb-6">
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
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={32}
                    placeholder="yourhandle"
                    className="w-full bg-[#181924] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>

              {mode === 'register' && (
                <div className="animate-enter">
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    minLength={1}
                    maxLength={50}
                    placeholder="Full Name"
                    className="w-full bg-[#181924] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
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
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="••••••••"
                    className="w-full bg-[#181924] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-enter">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={busy}
                className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-indigo-500 via-indigo-600 to-blue-600 hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {busy ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Processing…</span>
                  </>
                ) : mode === 'login' ? (
                  'Sign In to BUBI'
                ) : (
                  'Create Free Account'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { ChatScreen } from '@/features/conversations/ChatScreen'

export function App() {
  const { user, loading, init } = useAuthStore()

  useEffect(() => { void init() }, [init])

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg)] text-[var(--muted)]">
        <div className="text-sm">Loading BUBI…</div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthScreen />} />
      <Route path="/*" element={user ? <ChatScreen /> : <Navigate to="/auth" replace />} />
    </Routes>
  )
}

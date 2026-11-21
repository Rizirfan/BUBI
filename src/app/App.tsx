import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { ChatScreen } from '@/features/conversations/ChatScreen'
import { BubiLogo } from '@/components/ui/BubiLogo'

export function App() {
  const { user, loading, init } = useAuthStore()

  useEffect(() => {
    void init()
  }, [init])

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--text)]">
        <BubiLogo size={52} className="shadow-lg mb-4 animate-pulse" />
        <div className="flex items-center gap-2 text-xs font-medium text-[var(--text-muted)]">
          <span className="w-4 h-4 border-2 border-orange-200 border-t-[#f97316] rounded-full animate-spin" />
        </div>
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

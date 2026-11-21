import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { AuthScreen } from '@/features/auth/AuthScreen'
import { ChatScreen } from '@/features/conversations/ChatScreen'

export function App() {
  const { user, loading, init } = useAuthStore()

  useEffect(() => {
    void init()
  }, [init])

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#09090b] text-white">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-black text-xl shadow-xl shadow-indigo-600/30 animate-pulse mb-4">
          B
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span className="w-3.5 h-3.5 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span>Connecting to BUBI…</span>
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

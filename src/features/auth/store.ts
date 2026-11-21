import { create } from 'zustand'
import type { AuthUser } from '@/types'
import { api } from '@/services/api'
import { disconnectSocket } from '@/services/socket'

interface AuthState {
  user: AuthUser | null
  token: string | null
  loading: boolean
  error: string | null
  init: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  register: (username: string, displayName: string, password: string) => Promise<void>
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('bubi_token'),
  loading: true,
  error: null,
  init: async () => {
    const token = localStorage.getItem('bubi_token')
    if (!token) { set({ loading: false, user: null, token: null }); return }
    try {
      const { user } = await api.me()
      set({ user: { ...user, token }, token, loading: false, error: null })
    } catch {
      localStorage.removeItem('bubi_token')
      set({ user: null, token: null, loading: false })
    }
  },
  login: async (username, password) => {
    set({ error: null })
    const res = await api.login({ username, password })
    localStorage.setItem('bubi_token', res.token)
    set({ user: { ...res.user, token: res.token }, token: res.token, error: null })
  },
  register: async (username, displayName, password) => {
    set({ error: null })
    const res = await api.register({ username, displayName, password })
    localStorage.setItem('bubi_token', res.token)
    set({ user: { ...res.user, token: res.token }, token: res.token, error: null })
  },
  logout: () => {
    localStorage.removeItem('bubi_token')
    disconnectSocket()
    set({ user: null, token: null, error: null })
  },
}))

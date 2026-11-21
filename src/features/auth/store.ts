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
  updateProfile: (data: { displayName?: string; bio?: string; dailyNote?: string; avatarColor?: string }) => Promise<void>
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
      let localOverride: any = {}
      try {
        const raw = localStorage.getItem(`bubi_profile_${user.id}`)
        if (raw) localOverride = JSON.parse(raw)
      } catch {}
      set({ user: { ...user, ...localOverride, token }, token, loading: false, error: null })
    } catch {
      localStorage.removeItem('bubi_token')
      set({ user: null, token: null, loading: false })
    }
  },
  login: async (username, password) => {
    set({ error: null })
    const res = await api.login({ username, password })
    localStorage.setItem('bubi_token', res.token)
    let localOverride: any = {}
    try {
      const raw = localStorage.getItem(`bubi_profile_${res.user.id}`)
      if (raw) localOverride = JSON.parse(raw)
    } catch {}
    set({ user: { ...res.user, ...localOverride, token: res.token }, token: res.token, error: null })
  },
  register: async (username, displayName, password) => {
    set({ error: null })
    const res = await api.register({ username, displayName, password })
    localStorage.setItem('bubi_token', res.token)
    set({ user: { ...res.user, token: res.token }, token: res.token, error: null })
  },
  updateProfile: async (data) => {
    set((state) => {
      if (!state.user) return state
      const updated = {
        ...state.user,
        ...data,
        dailyNoteAt: data.dailyNote !== undefined ? new Date().toISOString() : state.user.dailyNoteAt,
      }
      try {
        localStorage.setItem(`bubi_profile_${state.user.id}`, JSON.stringify(updated))
      } catch {}
      return { user: updated }
    })
    try {
      const res = await api.updateProfile(data)
      set((state) => (state.user ? { user: { ...state.user, ...res.user } } : {}))
    } catch (err) {
      console.warn('Backend profile update failed or offline, kept local profile:', err)
    }
  },
  logout: () => {
    localStorage.removeItem('bubi_token')
    disconnectSocket()
    set({ user: null, token: null, error: null })
  },
}))

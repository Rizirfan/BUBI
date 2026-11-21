import type { AuthUser, Conversation, Message, Reaction, UserProfile } from '@/types'

function normalizeBaseUrl(url: string) {
  let u = url.trim()
  u = u.replace(/^(https?:\/)([^/])/, '$1/$2') // fix https// missing colon
  u = u.replace(/^(https?:\/\/)+/, (m) => m.toLowerCase().startsWith('https') ? 'https://' : 'http://')
  return u.replace(/\/$/, '')
}

const BASE = normalizeBaseUrl(import.meta.env.VITE_API_URL || '/api')

function getToken() {
  return localStorage.getItem('bubi_token')
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export const api = {
  register: (body: { username: string; displayName: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    request<{ token: string; user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<{ user: UserProfile }>('/me'),
  users: () => request<{ users: UserProfile[] }>('/users'),
  userProfile: (userId: string) => request<{ user: UserProfile }>(`/users/${userId}`),
  updateProfile: (body: { displayName?: string; bio?: string; dailyNote?: string; avatarColor?: string }) =>
    request<{ user: UserProfile }>('/profile', { method: 'PATCH', body: JSON.stringify(body) }),
  conversations: () => request<{ conversations: Conversation[] }>('/conversations'),
  createDirect: (userId: string) =>
    request<{ conversation: Conversation }>('/conversations/direct', { method: 'POST', body: JSON.stringify({ userId }) }),
  messages: (conversationId: string) =>
    request<{ messages: Message[]; reactions: Reaction[] }>(`/conversations/${conversationId}/messages`),
}

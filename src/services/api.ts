import type { AuthUser, Conversation, Message, Reaction } from '@/types'

const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

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
  me: () => request<{ user: { id: string; username: string; displayName: string } }>('/me'),
  users: () => request<{ users: { id: string; username: string; displayName: string }[] }>('/users'),
  conversations: () => request<{ conversations: Conversation[] }>('/conversations'),
  createDirect: (userId: string) =>
    request<{ conversation: Conversation }>('/conversations/direct', { method: 'POST', body: JSON.stringify({ userId }) }),
  messages: (conversationId: string) =>
    request<{ messages: Message[]; reactions: Reaction[] }>(`/conversations/${conversationId}/messages`),
}

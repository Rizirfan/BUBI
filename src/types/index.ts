export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface Profile {
  id: string
  username: string
  displayName: string
  avatarColor?: string
  createdAt: number
  updatedAt: number
  isLocal?: boolean
}

export interface Conversation {
  id: string
  kind: 'direct'
  participantIds: string[]
  participantNames?: Record<string, string>
  title?: string
  lastMessagePreview?: string
  lastMessageAt: number
  updatedAt: number
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  text: string
  emojiIds?: string[]
  status: MessageStatus
  createdAt: number
  updatedAt: number
  syncedAt?: number
  clientNonce?: string
}

export interface Reaction {
  id: string
  messageId: string
  userId: string
  emojiId: string
  createdAt: number
}

export interface AuthUser {
  id: string
  username: string
  displayName: string
  token: string
}

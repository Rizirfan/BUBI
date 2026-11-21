import Dexie, { type Table } from 'dexie'
import type { Conversation, Message, Profile, Reaction } from '@/types'

export class BubiDB extends Dexie {
  profiles!: Table<Profile, string>
  conversations!: Table<Conversation, string>
  messages!: Table<Message, string>
  reactions!: Table<Reaction, string>

  constructor() {
    super('bubi-db')
    this.version(1).stores({
      profiles: 'id, username, updatedAt',
      conversations: 'id, updatedAt, lastMessageAt',
      messages: 'id, conversationId, senderId, createdAt, [conversationId+createdAt], clientNonce, status',
      reactions: 'id, messageId, userId, emojiId, [messageId+userId+emojiId], createdAt'
    })
  }
}

export const db = new BubiDB()

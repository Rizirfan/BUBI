import { Server } from 'socket.io'
import type { FastifyInstance } from 'fastify'
import { prisma } from '../db.js'
import { z } from 'zod'
import type { AuthPayload } from '../auth.js'
import { corsOriginHandler } from '../cors.js'

const sendSchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().trim().min(1).max(2000),
  emojiIds: z.array(z.string()).optional().default([]),
  clientNonce: z.string().min(1),
})

const reactionSchema = z.object({
  messageId: z.string().min(1),
  emojiId: z.string().min(1),
})

function serializeMessage(m: any) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    text: m.text,
    emojiIds: JSON.parse(m.emojiIdsJson || '[]'),
    status: 'delivered',
    createdAt: m.createdAt.getTime(),
    updatedAt: m.updatedAt.getTime(),
    clientNonce: m.clientNonce ?? undefined,
  }
}

let ioInstance: Server | null = null

export function getIO(): Server | null {
  return ioInstance
}

export function setupSocket(app: FastifyInstance) {
  const io = new Server(app.server, {
    cors: { origin: corsOriginHandler, credentials: true },
  })
  ioInstance = io

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || (socket.handshake.headers.authorization || '').replace('Bearer ', '')
    if (!token) return next(new Error('Unauthorized'))
    try {
      const payload = app.jwt.verify<AuthPayload>(token)
      ;(socket as any).user = payload
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', async (socket) => {
    const user = (socket as any).user as AuthPayload
    socket.join(`user:${user.sub}`)

    // Auto-join all current conversation rooms for this user
    try {
      const memberships = await prisma.conversationMember.findMany({
        where: { userId: user.sub },
        select: { conversationId: true },
      })
      for (const m of memberships) {
        socket.join(`conversation:${m.conversationId}`)
      }
    } catch {}

    socket.on('conversation:join', async (conversationId: string) => {
      const member = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: user.sub } },
      })
      if (member) socket.join(`conversation:${conversationId}`)
    })

    socket.on('message:send', async (payload, ack) => {
      const parsed = sendSchema.safeParse(payload)
      if (!parsed.success) return ack?.({ error: 'Invalid input' })
      const { conversationId, text, emojiIds, clientNonce } = parsed.data
      const member = await prisma.conversationMember.findUnique({
        where: { conversationId_userId: { conversationId, userId: user.sub } },
      })
      if (!member) return ack?.({ error: 'Forbidden' })

      try {
        const msg = await prisma.message.upsert({
          where: { conversationId_clientNonce: { conversationId, clientNonce } },
          update: {},
          create: {
            conversationId,
            senderId: user.sub,
            text,
            emojiIdsJson: JSON.stringify(emojiIds || []),
            clientNonce,
          },
        })
        await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
        const serialized = serializeMessage(msg)
        
        // Immediate acknowledgment for instant UI feedback
        ack?.({ ok: true, message: serialized })

        // Asynchronously broadcast to conversation room and to each member directly
        io.to(`conversation:${conversationId}`).emit('message:new', serialized)
        prisma.conversationMember.findMany({ where: { conversationId } }).then((members) => {
          for (const m of members) {
            io.to(`user:${m.userId}`).emit('message:new', serialized)
            io.to(`user:${m.userId}`).emit('conversation:updated', {
              conversationId,
              lastMessagePreview: text,
              lastMessageAt: serialized.createdAt,
            })
          }
        }).catch(() => {})
      } catch (e: any) {
        ack?.({ error: e?.message || 'Failed to send' })
      }
    })

    socket.on('reaction:toggle', async (payload, ack) => {
      const parsed = reactionSchema.safeParse(payload)
      if (!parsed.success) return ack?.({ error: 'Invalid input' })
      const { messageId, emojiId } = parsed.data
      const msg = await prisma.message.findUnique({ where: { id: messageId }, include: { conversation: { include: { members: true } } } })
      if (!msg) return ack?.({ error: 'Message not found' })
      const isMember = msg.conversation.members.some(m => m.userId === user.sub)
      if (!isMember) return ack?.({ error: 'Forbidden' })

      const existing = await prisma.reaction.findUnique({
        where: { messageId_userId_emojiId: { messageId, userId: user.sub, emojiId } },
      })
      if (existing) {
        await prisma.reaction.delete({ where: { id: existing.id } })
        const removedPayload = {
          action: 'removed',
          reaction: { id: existing.id, messageId, userId: user.sub, emojiId, createdAt: existing.createdAt.getTime() },
        }
        io.to(`conversation:${msg.conversationId}`).emit('reaction:updated', removedPayload)
        for (const m of msg.conversation.members) {
          io.to(`user:${m.userId}`).emit('reaction:updated', removedPayload)
        }
        return ack?.({ ok: true, action: 'removed' })
      } else {
        const reaction = await prisma.reaction.create({ data: { messageId, userId: user.sub, emojiId } })
        const serialized = { id: reaction.id, messageId, userId: user.sub, emojiId, createdAt: reaction.createdAt.getTime() }
        const addedPayload = { action: 'added', reaction: serialized }
        io.to(`conversation:${msg.conversationId}`).emit('reaction:updated', addedPayload)
        for (const m of msg.conversation.members) {
          io.to(`user:${m.userId}`).emit('reaction:updated', addedPayload)
        }
        return ack?.({ ok: true, action: 'added', reaction: serialized })
      }
    })
  })

  return io
}

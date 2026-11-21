import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, type AuthPayload } from '../auth.js'
import { getIO } from '../realtime/socket.js'

function serializeMessage(m: any) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    text: m.text,
    emojiIds: JSON.parse(m.emojiIdsJson || '[]'),
    status: 'sent',
    createdAt: m.createdAt.getTime(),
    updatedAt: m.updatedAt.getTime(),
    clientNonce: m.clientNonce ?? undefined,
  }
}

export async function conversationRoutes(app: FastifyInstance) {
  app.get('/api/conversations', { preHandler: requireAuth }, async (request) => {
    const auth = request.user as AuthPayload
    const memberships = await prisma.conversationMember.findMany({
      where: { userId: auth.sub },
      include: {
        conversation: {
          include: {
            members: { include: { user: { select: { id: true, displayName: true, username: true } } } },
            messages: { orderBy: { createdAt: 'desc' }, take: 1 },
          },
        },
      },
      orderBy: { conversation: { updatedAt: 'desc' } },
    })
    const conversations = memberships.map((m) => {
      const c = m.conversation
      const names: Record<string, string> = {}
      for (const mem of c.members) names[mem.userId] = mem.user.displayName
      const last = c.messages[0]
      return {
        id: c.id,
        kind: 'direct',
        participantIds: c.members.map((x) => x.userId),
        participantNames: names,
        lastMessagePreview: last?.text ?? '',
        lastMessageAt: last ? last.createdAt.getTime() : c.updatedAt.getTime(),
        updatedAt: c.updatedAt.getTime(),
      }
    })
    return { conversations }
  })

  app.post('/api/conversations/direct', { preHandler: requireAuth }, async (request, reply) => {
    const auth = request.user as AuthPayload
    const parsed = z.object({ userId: z.string().min(1) }).safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const otherId = parsed.data.userId
    if (otherId === auth.sub) return reply.code(400).send({ error: 'Cannot chat with yourself' })
    const other = await prisma.user.findUnique({ where: { id: otherId } })
    if (!other) return reply.code(404).send({ error: 'User not found' })

    const existing = await prisma.conversation.findFirst({
      where: {
        kind: 'direct',
        AND: [
          { members: { some: { userId: auth.sub } } },
          { members: { some: { userId: otherId } } },
        ],
      },
      include: { members: { include: { user: { select: { id: true, displayName: true, username: true } } } } },
    })
    if (existing && existing.members.length === 2) {
      const names: Record<string, string> = {}
      for (const mem of existing.members) names[mem.userId] = mem.user.displayName
      return { conversation: { id: existing.id, kind: 'direct', participantIds: existing.members.map(m => m.userId), participantNames: names, lastMessageAt: existing.updatedAt.getTime(), updatedAt: existing.updatedAt.getTime() } }
    }

    const convo = await prisma.conversation.create({
      data: {
        kind: 'direct',
        members: { create: [{ userId: auth.sub }, { userId: otherId }] },
      },
      include: { members: { include: { user: { select: { id: true, displayName: true, username: true } } } } },
    })
    const names: Record<string, string> = {}
    for (const mem of convo.members) names[mem.userId] = mem.user.displayName
    return { conversation: { id: convo.id, kind: 'direct', participantIds: convo.members.map(m => m.userId), participantNames: names, lastMessageAt: convo.updatedAt.getTime(), updatedAt: convo.updatedAt.getTime() } }
  })

  app.get('/api/conversations/:id/messages', { preHandler: requireAuth }, async (request, reply) => {
    const auth = request.user as AuthPayload
    const { id } = request.params as { id: string }
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: id, userId: auth.sub } } })
    if (!member) return reply.code(403).send({ error: 'Forbidden' })
    const msgs = await prisma.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: 'asc' }, take: 200 })
    const reactions = await prisma.reaction.findMany({ where: { messageId: { in: msgs.map(m => m.id) } } })
    return {
      messages: msgs.map(serializeMessage),
      reactions: reactions.map(r => ({ id: r.id, messageId: r.messageId, userId: r.userId, emojiId: r.emojiId, createdAt: r.createdAt.getTime() })),
    }
  })

  app.post('/api/conversations/:id/messages', { preHandler: requireAuth }, async (request, reply) => {
    const auth = request.user as AuthPayload
    const { id: conversationId } = request.params as { id: string }
    const postSendSchema = z.object({
      text: z.string().trim().min(1).max(2000),
      emojiIds: z.array(z.string()).optional().default([]),
      clientNonce: z.string().optional(),
    })
    const parsed = postSendSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const { text, emojiIds } = parsed.data
    const clientNonce = parsed.data.clientNonce || crypto.randomUUID()

    const member = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId: auth.sub } },
    })
    if (!member) return reply.code(403).send({ error: 'Forbidden' })

    const msg = await prisma.message.upsert({
      where: { conversationId_clientNonce: { conversationId, clientNonce } },
      update: {},
      create: {
        conversationId,
        senderId: auth.sub,
        text,
        emojiIdsJson: JSON.stringify(emojiIds || []),
        clientNonce,
      },
    })
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
    const serialized = serializeMessage(msg)

    // Broadcast through socket if available
    const io = getIO()
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:new', serialized)
      const members = await prisma.conversationMember.findMany({ where: { conversationId } })
      for (const m of members) {
        io.to(`user:${m.userId}`).emit('message:new', serialized)
        io.to(`user:${m.userId}`).emit('conversation:updated', {
          conversationId,
          lastMessagePreview: text,
          lastMessageAt: serialized.createdAt,
        })
      }
    }

    return { message: serialized }
  })
}

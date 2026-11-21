import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { hashPassword, verifyPassword, requireAuth, type AuthPayload } from '../auth.js'

const credsSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(32, 'Username cannot exceed 32 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dots, or hyphens (no spaces)'),
  displayName: z
    .string()
    .min(1, 'Display name cannot be empty')
    .max(50, 'Display name cannot exceed 50 characters'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(128, 'Password cannot exceed 128 characters'),
})

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(50),
  password: z.string().min(1, 'Password is required').max(128),
})

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(160).optional(),
  dailyNote: z.string().max(500).refine((val) => {
    if (!val) return true
    return val.split('\n').length <= 10
  }, { message: 'Daily note cannot exceed 10 lines' }).optional(),
  avatarColor: z.string().max(30).optional(),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const body = (typeof request.body === 'object' && request.body ? request.body : {}) as any
    let rawUsername = String(body.username || '').trim()
    let rawDisplayName = String(body.displayName || '').trim()
    const rawPassword = String(body.password || '')

    // Strip leading '@' if user typed handle like '@Mohd_irfan'
    let username = rawUsername.replace(/^@+/, '')
    let displayName = rawDisplayName.replace(/^@+/, '')

    // If user put full name (with spaces) in username and handle in displayName:
    // e.g. username = "Mohamed Irfan", displayName = "Mohd_irfan" -> intelligently assign correctly
    if (username.includes(' ') && !displayName.includes(' ')) {
      const temp = username
      username = displayName
      displayName = temp
    } else if (username.includes(' ')) {
      // If username has spaces, auto-replace spaces with underscores
      username = username.replace(/\s+/g, '_')
    }

    if (!displayName) {
      displayName = rawDisplayName || rawUsername || username
    }

    const parsed = credsSchema.safeParse({ username, displayName, password: rawPassword })
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Invalid input'
      return reply.code(400).send({ error: firstError, details: parsed.error.flatten() })
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: username } },
          { username: { equals: username.toLowerCase() } },
        ],
      },
    })
    if (existing) return reply.code(409).send({ error: 'Username already taken. Please choose another.' })

    const passwordHash = await hashPassword(rawPassword)
    const user = await prisma.user.create({ data: { username, displayName, passwordHash } })
    const payload: AuthPayload = { sub: user.id, username: user.username, displayName: user.displayName }
    const token = app.jwt.sign(payload)
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        dailyNote: user.dailyNote,
        dailyNoteAt: user.dailyNoteAt,
        avatarColor: user.avatarColor,
      },
    }
  })

  app.post('/api/auth/login', async (request, reply) => {
    const body = (typeof request.body === 'object' && request.body ? request.body : {}) as any
    let rawUsername = String(body.username || '').trim()
    const rawPassword = String(body.password || '')

    // Strip leading '@' if user typed handle like '@Mohd_irfan'
    const username = rawUsername.replace(/^@+/, '')

    const parsed = loginSchema.safeParse({ username, password: rawPassword })
    if (!parsed.success) {
      const firstError = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0] || 'Invalid input'
      return reply.code(400).send({ error: firstError })
    }

    // Try finding by exact username, username with spaces converted to underscores, or by displayName
    let user = await prisma.user.findUnique({ where: { username } })
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { username: { equals: username.replace(/\s+/g, '_') } },
            { displayName: { equals: rawUsername } },
          ],
        },
      })
    }
    if (!user) return reply.code(401).send({ error: 'Invalid username or password' })
    const ok = await verifyPassword(rawPassword, user.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'Invalid username or password' })
    const payload: AuthPayload = { sub: user.id, username: user.username, displayName: user.displayName }
    const token = app.jwt.sign(payload)
    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        bio: user.bio,
        dailyNote: user.dailyNote,
        dailyNoteAt: user.dailyNoteAt,
        avatarColor: user.avatarColor,
      },
    }
  })

  app.get('/api/me', { preHandler: requireAuth }, async (request) => {
    const auth = request.user as AuthPayload
    const user = await prisma.user.findUnique({
      where: { id: auth.sub },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        dailyNote: true,
        dailyNoteAt: true,
        avatarColor: true,
      },
    })
    return { user }
  })

  app.patch('/api/profile', { preHandler: requireAuth }, async (request, reply) => {
    const auth = request.user as AuthPayload
    const parsed = updateProfileSchema.safeParse(request.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    }
    const { displayName, bio, dailyNote, avatarColor } = parsed.data
    const updateData: any = {}
    if (displayName !== undefined) updateData.displayName = displayName
    if (bio !== undefined) updateData.bio = bio
    if (dailyNote !== undefined) {
      updateData.dailyNote = dailyNote
      updateData.dailyNoteAt = new Date()
    }
    if (avatarColor !== undefined) updateData.avatarColor = avatarColor

    const updated = await prisma.user.update({
      where: { id: auth.sub },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        dailyNote: true,
        dailyNoteAt: true,
        avatarColor: true,
      },
    })
    return { user: updated }
  })

  app.get('/api/users', { preHandler: requireAuth }, async (request) => {
    const auth = request.user as AuthPayload
    const users = await prisma.user.findMany({
      where: { id: { not: auth.sub } },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        dailyNote: true,
        dailyNoteAt: true,
        avatarColor: true,
      },
      orderBy: { displayName: 'asc' },
      take: 50,
    })
    return { users }
  })

  app.get('/api/users/:id', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string }
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        dailyNote: true,
        dailyNoteAt: true,
        avatarColor: true,
        createdAt: true,
      },
    })
    if (!user) return reply.code(404).send({ error: 'User not found' })
    return { user }
  })
}

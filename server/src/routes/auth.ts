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
    let rawName = String(body.displayName || body.name || '').trim()
    let rawUsername = String(body.username || '').trim()
    const rawPassword = String(body.password || '')

    if (!rawPassword || rawPassword.length < 6) {
      return reply.code(400).send({ error: 'Password must be at least 6 characters' })
    }

    // Determine displayName
    let displayName = rawName
    if (!displayName && rawUsername) {
      displayName = rawUsername.replace(/^@+/, '')
    }
    if (!displayName) {
      displayName = 'BUBI User'
    }

    // Determine clean username handle
    let baseHandle = rawUsername.replace(/^@+/, '').toLowerCase()
    // If username was not given or had spaces, derive it from displayName
    if (!baseHandle || baseHandle.includes(' ') || baseHandle === 'bubi') {
      baseHandle = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
    }
    if (!baseHandle || baseHandle.length < 3) {
      baseHandle = `${baseHandle || 'user'}_bubi`
    }
    if (baseHandle.length < 3) {
      baseHandle = `bubi_${Math.floor(100 + Math.random() * 900)}`
    }

    // Ensure unique username handle automatically (never fail on duplicate)
    let candidateUsername = baseHandle.slice(0, 32)
    let counter = 1
    while (await prisma.user.findFirst({ where: { username: { equals: candidateUsername } } })) {
      const suffix = `_${counter}`
      candidateUsername = `${baseHandle.slice(0, 32 - suffix.length)}${suffix}`
      counter++
    }

    const passwordHash = await hashPassword(rawPassword)
    const user = await prisma.user.create({
      data: {
        username: candidateUsername,
        displayName,
        passwordHash,
      },
    })
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
    let rawIdentifier = String(body.username || body.name || '').trim()
    const rawPassword = String(body.password || '')

    if (!rawIdentifier) {
      return reply.code(400).send({ error: 'Name or username is required' })
    }
    if (!rawPassword) {
      return reply.code(400).send({ error: 'Password is required' })
    }

    const cleanInput = rawIdentifier.replace(/^@+/, '')
    const slugInput = cleanInput.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')

    // Find by exact username, lowercase username, slugged username, or displayName
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: { equals: cleanInput } },
          { username: { equals: cleanInput.toLowerCase() } },
          { username: { equals: slugInput } },
          { displayName: { equals: rawIdentifier } },
          { displayName: { equals: cleanInput } },
        ],
      },
    })

    if (!user) {
      return reply.code(401).send({ error: 'Account not found. Please check your name or create an account.' })
    }

    const ok = await verifyPassword(rawPassword, user.passwordHash)
    if (!ok) {
      return reply.code(401).send({ error: 'Incorrect password. Please try again.' })
    }

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

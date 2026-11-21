import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../db.js'
import { hashPassword, verifyPassword, requireAuth, type AuthPayload } from '../auth.js'

const credsSchema = z.object({
  username: z.string().min(3).max(32).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  password: z.string().min(6).max(128)
})

const loginSchema = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(128)
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/api/auth/register', async (request, reply) => {
    const parsed = credsSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input', details: parsed.error.flatten() })
    const { username, displayName, password } = parsed.data
    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) return reply.code(409).send({ error: 'Username already taken' })
    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({ data: { username, displayName, passwordHash } })
    const payload: AuthPayload = { sub: user.id, username: user.username, displayName: user.displayName }
    const token = app.jwt.sign(payload)
    return { token, user: { id: user.id, username: user.username, displayName: user.displayName } }
  })

  app.post('/api/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) return reply.code(400).send({ error: 'Invalid input' })
    const { username, password } = parsed.data
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return reply.code(401).send({ error: 'Invalid credentials' })
    const ok = await verifyPassword(password, user.passwordHash)
    if (!ok) return reply.code(401).send({ error: 'Invalid credentials' })
    const payload: AuthPayload = { sub: user.id, username: user.username, displayName: user.displayName }
    const token = app.jwt.sign(payload)
    return { token, user: { id: user.id, username: user.username, displayName: user.displayName } }
  })

  app.get('/api/me', { preHandler: requireAuth }, async (request) => {
    const auth = request.user as AuthPayload
    const user = await prisma.user.findUnique({ where: { id: auth.sub }, select: { id: true, username: true, displayName: true } })
    return { user }
  })

  app.get('/api/users', { preHandler: requireAuth }, async (request) => {
    const auth = request.user as AuthPayload
    const users = await prisma.user.findMany({
      where: { id: { not: auth.sub } },
      select: { id: true, username: true, displayName: true },
      orderBy: { displayName: 'asc' },
      take: 50,
    })
    return { users }
  })
}

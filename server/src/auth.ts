import bcrypt from 'bcryptjs'
import type { FastifyReply, FastifyRequest } from 'fastify'

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify()
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' })
  }
}

export type AuthPayload = { sub: string; username: string; displayName: string }

import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { authRoutes } from './routes/auth.js'
import { conversationRoutes } from './routes/conversations.js'
import { setupSocket } from './realtime/socket.js'
import { prisma } from './db.js'
import { corsOriginHandler } from './cors.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: corsOriginHandler,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})

await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-me',
})

app.get('/api/health', async () => ({ ok: true }))

await authRoutes(app)
await conversationRoutes(app)

setupSocket(app)

const port = Number(process.env.PORT || 3001)
try {
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`Server listening on http://localhost:${port}`)
} catch (err) {
  app.log.error(err)
  await prisma.$disconnect()
  process.exit(1)
}

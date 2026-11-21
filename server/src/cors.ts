function parseAllowedOrigins(): string[] {
  const env = process.env.CORS_ORIGIN?.trim()
  const defaults = [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'https://bubi-ivory.vercel.app',
    '*.vercel.app',
  ]

  if (!env) {
    return defaults
  }

  const userOrigins = env
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean)

  return Array.from(new Set([...userOrigins, ...defaults]))
}

export function isOriginAllowed(origin: string | undefined): boolean {
  // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
  if (!origin) return true

  const env = process.env.CORS_ORIGIN?.trim()
  if (env === '*' || env === 'all' || env === 'true') {
    return true
  }

  const normalized = origin.trim().replace(/\/+$/, '')

  // Allow localhost & 127.0.0.1 on any port for local development
  if (
    /^https?:\/\/localhost(:\d+)?$/.test(normalized) ||
    /^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized)
  ) {
    return true
  }

  const allowedList = parseAllowedOrigins()
  return allowedList.some((pattern) => {
    if (pattern === '*') return true
    if (pattern.startsWith('*.')) {
      const domain = pattern.slice(2)
      try {
        const url = new URL(normalized)
        return url.hostname.endsWith(`.${domain}`) || url.hostname === domain
      } catch {
        return false
      }
    }
    return normalized === pattern
  })
}

export function corsOriginHandler(
  origin: string | undefined,
  cb: (err: Error | null, allow: boolean) => void,
) {
  cb(null, isOriginAllowed(origin))
}

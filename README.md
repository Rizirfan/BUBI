# BUBI

BUBI is a web-based mobile messaging PWA focused on **text-only chat** with **custom emojis** and **reactions**. It uses an Apple Messages-inspired UI and a custom Node.js backend (no Firebase).

## Features

- **Text messaging only** — no photo, video, or voice
- **Custom emoji set** — unique SVG emojis for picker and inline message emojis
- **Reactions** — quick emoji reactions on messages
- **Real-time chat** — Socket.IO for live message/reaction updates
- **Custom auth** — register/login with username, display name, and password (JWT + bcrypt)
- **Local persistence** — Dexie/IndexedDB stores profile, conversations, messages, and reactions locally (Room-equivalent for web)
- **PWA** — installable, mobile-first layout with safe-area support

## Tech Stack

**Frontend**
- Vite + React + TypeScript
- Tailwind CSS
- Dexie (IndexedDB)
- Socket.IO client
- Zustand
- `vite-plugin-pwa`

**Backend**
- Node.js + TypeScript
- Fastify
- Socket.IO
- Prisma + SQLite
- JWT auth (`@fastify/jwt`) + `bcryptjs`

## Project Structure

```text
.
├── public/                 # PWA icons/assets
├── server/                 # Custom backend
│   ├── prisma/             # Prisma schema
│   └── src/                # API, auth, realtime socket
├── src/                    # Frontend app
│   ├── app/                # App shell/routes
│   ├── components/chat/    # Bubble, composer, emoji picker
│   ├── db/                 # Dexie local DB
│   ├── features/           # Auth, conversations, emojis
│   └── services/           # API + socket clients
├── DEPLOY.md               # Vercel + Render deployment guide
└── vercel.json             # SPA rewrite for Vercel
```

## Local Development

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # Windows: Copy-Item .env.example .env
npx prisma db push
npm run dev
```

Backend runs on `http://localhost:3001`.

### 2. Frontend

```bash
npm install
npm run dev
```

Frontend runs on `http://localhost:5173` and proxies `/api` and `/socket.io` to the backend.

## Environment Variables

### Frontend (`.env`)

```env
VITE_API_URL=https://your-render-service.onrender.com/api
VITE_SOCKET_URL=https://your-render-service.onrender.com
```

For local dev, these are optional because Vite proxy is configured.

### Backend (`server/.env`)

```env
PORT=3001
JWT_SECRET=change-me-in-production
DATABASE_URL="file:./dev.db"
CORS_ORIGIN=http://localhost:5173
```

For production, set `CORS_ORIGIN` to your Vercel URL.

## Deployment

See [DEPLOY.md](./DEPLOY.md) for Vercel (frontend) + Render (backend) steps.

> **Note:** SQLite on Render is ephemeral unless you attach a persistent disk. For durable production data, use a persistent disk or migrate Prisma to PostgreSQL.

## Scripts

### Frontend
- `npm run dev` — start Vite dev server
- `npm run build` — typecheck + production build
- `npm run preview` — preview production build

### Backend (`server/`)
- `npm run dev` — start backend with tsx watch
- `npm run build` — generate Prisma client + compile TypeScript
- `npm start` — run compiled server
- `npm run prisma:push` — push Prisma schema to DB

## License

MIT (add a LICENSE file if you want to publish under MIT).

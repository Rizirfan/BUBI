# Deploying BUBI

## 1) Backend on Render

1. Push this repo to GitHub.
2. In Render, create a **Web Service** from the repo.
3. Set **Root Directory** to `server`.
4. Set **Build Command** to:
   ```bash
   npm install && npm run build && npx prisma db push
   ```
5. Set **Start Command** to:
   ```bash
   npm start
   ```
6. Add environment variables:
   - `PORT` = `3001` (Render also provides `PORT`; the app uses it automatically)
   - `JWT_SECRET` = a long random secret
   - `DATABASE_URL` = `file:./dev.db` for quick testing, or `file:/var/data/dev.db` if using a Render persistent disk
   - `CORS_ORIGIN` = your Vercel frontend URL, e.g. `https://your-app.vercel.app`

> **Important (SQLite on Render):** Render's filesystem is ephemeral on free/standard instances without a disk. SQLite data will be lost on redeploy/restart unless you attach a **Persistent Disk** and point `DATABASE_URL` to it (e.g. mount `/var/data`, use `file:/var/data/dev.db`). For durable production data, consider switching Prisma to PostgreSQL.

## 2) Frontend on Vercel

1. In Vercel, import the same GitHub repo.
2. Set **Framework Preset** to Vite (auto-detected).
3. Set **Root Directory** to the repo root (not `server`).
4. Build/Output defaults are fine (`npm run build`, `dist`), and `vercel.json` is included for SPA routing.
5. Add environment variables:
   - `VITE_API_URL` = `https://your-render-service.onrender.com/api`
   - `VITE_SOCKET_URL` = `https://your-render-service.onrender.com`
6. Deploy.

## 3) After deploy

- Update Render `CORS_ORIGIN` to the exact Vercel URL.
- Create two accounts, start a direct chat, and verify real-time messages/reactions.
- Confirm custom emojis and reactions work; no media upload features are included.

## Local dev

```bash
# terminal 1
cd server
npm install
npx prisma db push
npm run dev

# terminal 2 (repo root)
npm install
npm run dev
```

Frontend dev server proxies `/api` and `/socket.io` to `http://localhost:3001`.

import 'dotenv/config'
import http from 'node:http'
import { validateEnv } from './config/validateEnv.js'
import app from './app.js'
import { connectDB } from './config/db.js'
import { seedIfEmpty } from './seed/seed.js'
import { bootstrapAdmin } from './config/bootstrapAdmin.js'
import { initSocket } from './services/socket.js'

const PORT = process.env.PORT || 5000

async function main() {
  validateEnv()
  await connectDB()
  // SECURITY: never auto-seed demo accounts (with publicly known passwords)
  // into a production database. Run `pnpm seed` manually if you really want
  // demo data, or set SEED_DEMO_DATA=true explicitly.
  if (process.env.NODE_ENV !== 'production' || process.env.SEED_DEMO_DATA === 'true') {
    await seedIfEmpty()
  }
  await bootstrapAdmin()

  const server = http.createServer(app)
  initSocket(server, {
    corsOrigins: (process.env.CLIENT_ORIGIN || 'http://localhost:3000').split(',').map((s) => s.trim()),
  })
  server.listen(PORT, () => {
    console.log(`[pigeono] API server listening on http://localhost:${PORT}`)
  })
}

main().catch((err) => {
  console.error('[pigeono] Fatal startup error:', err)
  process.exit(1)
})

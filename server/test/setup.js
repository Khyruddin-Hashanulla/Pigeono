import { connectDB, stopDB } from '../src/config/db.js'
import { seedIfEmpty } from '../src/seed/seed.js'
import app from '../src/app.js'

let ready = null

/**
 * Boots the app once per test process against an in-memory MongoDB
 * (MONGO_URI is intentionally left unset) and seeds the demo data.
 */
export async function getApp() {
  if (!ready) {
    ready = (async () => {
      delete process.env.MONGO_URI // force the in-memory fallback
      await connectDB()
      await seedIfEmpty()
      return app
    })()
  }
  return ready
}

/** Extracts a "name=value; name2=value2" Cookie header from a supertest response. */
export function cookiesFrom(res) {
  const setCookies = res.headers['set-cookie'] || []
  return setCookies.map((c) => c.split(';')[0]).join('; ')
}

/** Disconnects mongoose and stops the in-memory MongoDB so the process exits cleanly. */
export async function teardown() {
  await stopDB()
}

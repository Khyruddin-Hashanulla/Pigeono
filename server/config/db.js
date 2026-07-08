import mongoose from 'mongoose'

/**
 * Connects to MongoDB.
 * - If MONGO_URI is set (e.g. MongoDB Atlas), connect to it.
 * - Otherwise, fall back to an in-memory MongoDB instance (dev/preview only).
 */
let memServer = null

export async function connectDB() {
  let uri = process.env.MONGO_URI

  if (!uri) {
    console.warn(
      '[pigeono] MONGO_URI not set - starting in-memory MongoDB (dev only). Set MONGO_URI for persistence.'
    )
    const { MongoMemoryServer } = await import('mongodb-memory-server')
    memServer = await MongoMemoryServer.create({
      instance: { dbName: 'pigeono' },
    })
    uri = memServer.getUri('pigeono')
  }

  mongoose.set('sanitizeFilter', true) // guard against NoSQL injection in queries
  await mongoose.connect(uri)
  console.log('[pigeono] MongoDB connected')
}

/** Fully tears down the connection (and in-memory server) — used by tests. */
export async function stopDB() {
  await mongoose.disconnect()
  if (memServer) {
    await memServer.stop()
    memServer = null
  }
}

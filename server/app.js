import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit'

import authRoutes from './routes/auth.routes.js'
import listingRoutes from './routes/listing.routes.js'
import categoryRoutes from './routes/category.routes.js'
import storeRoutes from './routes/store.routes.js'
import vendorRoutes from './routes/vendor.routes.js'
import orderRoutes from './routes/order.routes.js'
import adminRoutes from './routes/admin.routes.js'
import messageRoutes from './routes/message.routes.js'
import uploadRoutes, { UPLOADS_DIR } from './routes/upload.routes.js'
import reviewRoutes from './routes/review.routes.js'
import subscriptionRoutes from './routes/subscription.routes.js'
import userRoutes from './routes/user.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import contentRoutes from './routes/content.routes.js'
import webhookRoutes from './routes/webhook.routes.js'
import seoRoutes from './routes/seo.routes.js'
import { errorHandler, notFound } from './middleware/error.js'

const app = express()

app.set('trust proxy', 1)
// app.use(helmet())
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
      frameSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
      connectSrc: ["'self'", "https://accounts.google.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())

app.use(
  cors({
    origin(origin, cb) {
      // Allow no-origin (server-to-server) and configured client origins.
      // For anything else, omit CORS headers instead of erroring: requests
      // proxied same-origin through Vite still succeed, while true
      // cross-origin browser callers are blocked by the missing headers.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      return cb(null, false)
    },
    credentials: true,
  })
)

// Webhooks need the raw request body for signature verification,
// so they are mounted before the global JSON body parser.
app.use('/api/v1/webhooks', webhookRoutes)

app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
})

app.get('/api/v1/health', (_req, res) => res.json({ success: true, message: 'ok' }))

app.use('/api/v1/auth', authLimiter, authRoutes)
app.use('/api/v1/listings', listingRoutes)
app.use('/api/v1/categories', categoryRoutes)
app.use('/api/v1/stores', storeRoutes)
app.use('/api/v1/vendor', vendorRoutes)
app.use('/api/v1/orders', orderRoutes)
app.use('/api/v1/admin', adminRoutes)
app.use('/api/v1/messages', messageRoutes)
app.use('/api/v1/uploads', uploadRoutes)
app.use('/api/v1/reviews', reviewRoutes)
app.use('/api/v1/subscriptions', subscriptionRoutes)
app.use('/api/v1/users', userRoutes)
app.use('/api/v1/notifications', notificationRoutes)
app.use('/api/v1/content', contentRoutes)
// Serve uploaded listing photos (1-day client cache)
app.use('/uploads', express.static(UPLOADS_DIR, { maxAge: '1d' }))
// SEO: sitemap.xml + robots.txt at the site root
app.use('/', seoRoutes)

app.use(notFound)
app.use(errorHandler)

export default app

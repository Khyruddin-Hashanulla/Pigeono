import { Router } from 'express'
import multer from 'multer'
import path from 'node:path'
import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { requireAuth, requireRoles } from '../middleware/auth.js'
import { ApiError } from '../middleware/error.js'
import { isCloudinaryConfigured, createPhotoStorage } from '../services/cloudinary.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }

const diskStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = ALLOWED[file.mimetype] || '.jpg'
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  },
})

// Cloudinary in production (durable), local disk in dev (zero config)
const storage = isCloudinaryConfigured() ? createPhotoStorage() : diskStorage

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new ApiError(400, 'Only JPG, PNG, or WebP images are allowed'))
    }
    cb(null, true)
  },
})

const router = Router()

/**
 * POST /api/v1/uploads — vendor photo upload (up to 5 images, 5MB each).
 * Returns public URLs served from /uploads.
 */
router.post('/', requireAuth, requireRoles('vendor'), upload.array('photos', 5), (req, res, next) => {
  try {
    if (!req.files?.length) throw new ApiError(400, 'No files uploaded')
    // Cloudinary provides an absolute URL in f.path. Local disk must ALSO
    // return an absolute URL (API origin) so images work on split deploys
    // where the frontend is on a different domain (e.g. Vercel + Render).
    // req.protocol honors X-Forwarded-Proto because trust proxy is set.
    const apiOrigin = `${req.protocol}://${req.get('host')}`
    const urls = req.files.map((f) =>
      isCloudinaryConfigured() ? f.path : `${apiOrigin}/uploads/${f.filename}`
    )
    res.status(201).json({ success: true, data: { urls } })
  } catch (err) {
    next(err)
  }
})

export default router

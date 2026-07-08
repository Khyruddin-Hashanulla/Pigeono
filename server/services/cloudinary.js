import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

/**
 * Cloudinary media storage — used automatically when CLOUDINARY_CLOUD_NAME is set.
 * Falls back to local disk storage otherwise (see upload.routes.js), so local
 * dev works with zero config while production hosts (Render/Railway/Vercel)
 * with ephemeral filesystems get durable cloud storage.
 */

export function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  )
}

let configured = false
function ensureConfig() {
  if (configured) return
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
  configured = true
}

/** Multer storage for pigeon listing photos (auto-resized to marketplace size). */
export function createPhotoStorage() {
  ensureConfig()
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'pigeono/photos',
      allowed_formats: ['jpg', 'png', 'webp'],
      transformation: [{ width: 1200, height: 900, crop: 'limit' }],
    },
  })
}

/** Multer storage for pedigree documents (images or PDFs). */
export function createPedigreeStorage() {
  ensureConfig()
  return new CloudinaryStorage({
    cloudinary,
    params: {
      folder: 'pigeono/pedigrees',
      allowed_formats: ['jpg', 'png', 'pdf'],
      resource_type: 'auto',
    },
  })
}

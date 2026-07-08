export class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message)
    this.statusCode = statusCode
    this.errors = errors
  }
}

export function notFound(_req, res) {
  res.status(404).json({ success: false, message: 'Route not found' })
}

// Centralized error handler -> consistent JSON error shape
// { success: false, message, errors? }
export function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500
  const body = {
    success: false,
    message: status === 500 ? 'Internal server error' : err.message,
  }
  if (err.errors) body.errors = err.errors
  if (status === 500) console.error('[pigeono] Unhandled error:', err)
  res.status(status).json(body)
}

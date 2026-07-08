import { validationResult } from 'express-validator'
import { ApiError } from './error.js'

/** Runs express-validator chains and returns 422 with field errors on failure */
export function validate(chains) {
  return [
    ...chains,
    (req, _res, next) => {
      const result = validationResult(req)
      if (result.isEmpty()) return next()
      const errors = result.array().map((e) => ({ field: e.path, message: e.msg }))
      next(new ApiError(422, 'Validation failed', errors))
    },
  ]
}

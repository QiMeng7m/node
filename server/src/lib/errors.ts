import type { Response } from 'express'

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'MODEL_UNAVAILABLE'
  | 'PROVIDER_ERROR'
  | 'VISION_NOT_SUPPORTED'
  | 'INTERNAL_ERROR'

export function sendError(
  res: Response,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown,
): void {
  res.status(status).json({
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  })
}

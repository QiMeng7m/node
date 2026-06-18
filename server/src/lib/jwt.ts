import jwt from 'jsonwebtoken'

export type JwtPayload = {
  sub: string
  role: string
  tv: number
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET 未配置')
  }
  return secret
}

export function signAccessToken(payload: JwtPayload): string {
  const expiresIn = process.env.JWT_EXPIRES_IN ?? '7d'
  return jwt.sign(payload, getSecret(), { expiresIn } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload
}

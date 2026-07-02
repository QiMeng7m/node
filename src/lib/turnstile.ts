import type { Request } from 'express'
import { getClientIp } from './clientIp.js'

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim())
}

export function getTurnstileSiteKey(): string | null {
  const key = process.env.TURNSTILE_SITE_KEY?.trim()
  return key || null
}

export async function verifyTurnstileToken(
  token: string | undefined,
  req: Request,
): Promise<string | null> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return null

  if (!token?.trim()) {
    return '请完成人机验证'
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
      remoteip: getClientIp(req),
    })

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    })

    const data = (await res.json()) as { success?: boolean }
    if (!data.success) {
      return '人机验证失败，请重试'
    }
    return null
  } catch {
    return '人机验证服务暂不可用，请稍后重试'
  }
}

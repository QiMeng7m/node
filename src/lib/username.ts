/** 账号规范化：去首尾空白，拉丁字母转小写（中文等不受影响） */
export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim()
  return trimmed.replace(/[A-Z]/g, (c) => c.toLowerCase())
}

export function validateUsername(username: string): string | null {
  if (username.length < 2) {
    return '账号至少 2 个字符'
  }
  if (username.length > 32) {
    return '账号最多 32 个字符'
  }
  if (!/^[\w\u4e00-\u9fff-]+$/.test(username)) {
    return '账号仅支持字母、数字、下划线、连字符与中文'
  }
  return null
}

export function readUsernamePassword(body: unknown): { username: string; password: string } | null {
  if (!body || typeof body !== 'object') return null
  const record = body as Record<string, unknown>
  const rawUsername =
    typeof record.username === 'string'
      ? record.username
      : typeof record.email === 'string'
        ? record.email
        : null
  const password = record.password
  if (typeof rawUsername !== 'string' || typeof password !== 'string') return null
  const username = normalizeUsername(rawUsername)
  if (!username || !password) return null
  return { username, password }
}

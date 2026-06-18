export function assertEnv(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL 未配置，请检查 server/.env')
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET 未配置或过短（至少 16 字符），请检查 server/.env')
  }
}

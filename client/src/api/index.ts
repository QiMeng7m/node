export interface Post {
  id: number
  title: string
  summary: string
  createdAt: string
}

export async function fetchPosts(): Promise<Post[]> {
  const res = await fetch('/api/posts')
  if (!res.ok) throw new Error('获取文章失败')
  return res.json()
}

export async function fetchHealth(): Promise<{ status: string; timestamp: string }> {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error('服务不可用')
  return res.json()
}

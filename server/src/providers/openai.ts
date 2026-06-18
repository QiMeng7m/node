export interface UpstreamMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface StreamChunk {
  delta?: string
  usage?: StreamUsage
}

export async function* streamChatCompletions(
  baseUrl: string,
  apiKey: string,
  upstreamModelId: string,
  messages: UpstreamMessage[],
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: upstreamModelId,
      messages,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.7,
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `上游模型请求失败 (${res.status})`)
  }

  if (!res.body) {
    throw new Error('上游响应体为空')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) continue
        const payload = trimmed.slice(5).trim()
        if (!payload || payload === '[DONE]') continue

        let parsed: unknown
        try {
          parsed = JSON.parse(payload)
        } catch {
          continue
        }

        const chunk = parsed as {
          choices?: { delta?: { content?: string } }[]
          usage?: {
            prompt_tokens?: number
            completion_tokens?: number
            total_tokens?: number
          }
        }

        const delta = chunk.choices?.[0]?.delta?.content
        const usage = chunk.usage
        if (delta) {
          yield { delta }
        }
        if (usage) {
          yield {
            usage: {
              promptTokens: usage.prompt_tokens ?? 0,
              completionTokens: usage.completion_tokens ?? 0,
              totalTokens: usage.total_tokens ?? 0,
            },
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

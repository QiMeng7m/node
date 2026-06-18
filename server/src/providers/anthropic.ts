import type { StreamChunk, UpstreamMessage } from './openai.js'

function messagesUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/$/, '')
  if (base.endsWith('/v1')) return `${base}/messages`
  return `${base}/v1/messages`
}

function splitMessages(messages: UpstreamMessage[]): {
  system?: string
  messages: { role: 'user' | 'assistant'; content: string }[]
} {
  let system: string | undefined
  const rest: { role: 'user' | 'assistant'; content: string }[] = []

  for (const msg of messages) {
    if (msg.role === 'system') {
      system = system ? `${system}\n\n${msg.content}` : msg.content
    } else {
      rest.push({ role: msg.role, content: msg.content })
    }
  }

  return { system, messages: rest }
}

type AnthropicPayload = {
  type?: string
  message?: { usage?: { input_tokens?: number } }
  delta?: { type?: string; text?: string; stop_reason?: string }
  usage?: { input_tokens?: number; output_tokens?: number }
  content?: Array<{ type?: string; text?: string }> | string
  choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>
}

function extractTextDelta(payload: AnthropicPayload, eventName: string): string | undefined {
  const type = payload.type ?? eventName

  if (type === 'content_block_delta' && payload.delta?.text) {
    return payload.delta.text
  }

  if (type === 'message_delta' && payload.delta?.type === 'text_delta' && payload.delta.text) {
    return payload.delta.text
  }

  const openaiDelta = payload.choices?.[0]?.delta?.content
  if (openaiDelta) return openaiDelta

  return undefined
}

function extractJsonMessageText(payload: AnthropicPayload): string | undefined {
  if (typeof payload.content === 'string' && payload.content.trim()) {
    return payload.content
  }

  if (Array.isArray(payload.content)) {
    const text = payload.content
      .filter((block) => block.type === 'text' && block.text)
      .map((block) => block.text!)
      .join('')
    if (text) return text
  }

  const openaiMessage = payload.choices?.[0]?.message?.content
  if (openaiMessage) return openaiMessage

  return undefined
}

function applyUsageFromPayload(
  payload: AnthropicPayload,
  eventName: string,
  usage: { promptTokens: number; completionTokens: number },
): void {
  const type = payload.type ?? eventName

  if ((type === 'message_start' || eventName === 'message_start') && payload.message?.usage?.input_tokens != null) {
    usage.promptTokens = payload.message.usage.input_tokens
  }

  if ((type === 'message_delta' || eventName === 'message_delta') && payload.usage?.output_tokens != null) {
    usage.completionTokens = payload.usage.output_tokens
  }

  if (payload.usage?.input_tokens != null) {
    usage.promptTokens = payload.usage.input_tokens
  }
  if (payload.usage?.output_tokens != null) {
    usage.completionTokens = payload.usage.output_tokens
  }
}

function* processSsePayload(
  payload: AnthropicPayload,
  eventName: string,
  usage: { promptTokens: number; completionTokens: number },
): Generator<StreamChunk> {
  applyUsageFromPayload(payload, eventName, usage)

  const delta = extractTextDelta(payload, eventName)
  if (delta) {
    yield { delta }
  }
}

export async function* streamAnthropicMessages(
  baseUrl: string,
  apiKey: string,
  upstreamModelId: string,
  messages: UpstreamMessage[],
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const { system, messages: chatMessages } = splitMessages(messages)
  const url = messagesUrl(baseUrl)

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: upstreamModelId,
      max_tokens: 4096,
      stream: true,
      ...(system ? { system } : {}),
      messages: chatMessages,
    }),
    signal,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `上游模型请求失败 (${res.status})`)
  }

  const contentType = res.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const payload = (await res.json()) as AnthropicPayload
    const text = extractJsonMessageText(payload)
    if (text) yield { delta: text }
    const usage = { promptTokens: 0, completionTokens: 0 }
    applyUsageFromPayload(payload, 'message', usage)
    if (usage.promptTokens || usage.completionTokens) {
      yield {
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.promptTokens + usage.completionTokens,
        },
      }
    }
    return
  }

  if (!res.body) {
    throw new Error('上游响应体为空')
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let eventName = 'message'
  const usage = { promptTokens: 0, completionTokens: 0 }

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue

        if (trimmed.startsWith('event:')) {
          eventName = trimmed.slice(6).trim()
          continue
        }

        if (!trimmed.startsWith('data:')) continue

        const raw = trimmed.slice(5).trim()
        if (!raw || raw === '[DONE]') continue

        let parsed: unknown
        try {
          parsed = JSON.parse(raw)
        } catch {
          continue
        }

        yield* processSsePayload(parsed as AnthropicPayload, eventName, usage)
      }
    }

    const trailing = buffer.trim()
    if (trailing.startsWith('data:')) {
      const raw = trailing.slice(5).trim()
      if (raw && raw !== '[DONE]') {
        try {
          const parsed = JSON.parse(raw) as AnthropicPayload
          yield* processSsePayload(parsed, eventName, usage)
        } catch {
          // ignore trailing partial chunk
        }
      }
    }

    if (usage.promptTokens || usage.completionTokens) {
      yield {
        usage: {
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.promptTokens + usage.completionTokens,
        },
      }
    }
  } finally {
    reader.releaseLock()
  }
}

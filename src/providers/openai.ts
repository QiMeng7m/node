import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export interface VisionImage {
  mime: string
  base64: string
}

export interface UpstreamMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: VisionImage[]
}

type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

function toOpenAIContent(msg: UpstreamMessage): string | OpenAIContentPart[] {
  if (!msg.images?.length) return msg.content
  const parts: OpenAIContentPart[] = []
  if (msg.content.trim()) {
    parts.push({ type: 'text', text: msg.content })
  }
  for (const img of msg.images) {
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${img.mime};base64,${img.base64}` },
    })
  }
  return parts.length ? parts : msg.content
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

function deepseekModelOptions(upstreamModelId: string): Record<string, unknown> {
  if (upstreamModelId === 'deepseek-v4-pro') {
    return {
      thinking: { type: 'enabled' },
      reasoning_effort: 'high',
    }
  }
  return {}
}

function toChatMessages(messages: UpstreamMessage[]): ChatCompletionMessageParam[] {
  return messages.map((msg) => ({
    role: msg.role,
    content: toOpenAIContent(msg),
  })) as ChatCompletionMessageParam[]
}

export async function* streamChatCompletions(
  baseUrl: string,
  apiKey: string,
  upstreamModelId: string,
  messages: UpstreamMessage[],
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  const openai = new OpenAI({
    baseURL: baseUrl.replace(/\/$/, ''),
    apiKey,
  })

  const stream = await openai.chat.completions.create(
    {
      model: upstreamModelId,
      messages: toChatMessages(messages),
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.7,
      ...deepseekModelOptions(upstreamModelId),
    },
    { signal },
  )

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content
    if (delta) {
      yield { delta }
    }

    const usage = chunk.usage
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

import { streamAnthropicMessages } from './anthropic.js'
import { streamChatCompletions, type StreamChunk, type UpstreamMessage } from './openai.js'

export type ProviderProtocol = 'openai-compat' | 'anthropic'

export async function* streamUpstreamChat(
  protocol: string,
  baseUrl: string,
  apiKey: string,
  upstreamModelId: string,
  messages: UpstreamMessage[],
  signal?: AbortSignal,
): AsyncGenerator<StreamChunk> {
  if (protocol === 'anthropic') {
    yield* streamAnthropicMessages(baseUrl, apiKey, upstreamModelId, messages, signal)
    return
  }
  yield* streamChatCompletions(baseUrl, apiKey, upstreamModelId, messages, signal)
}

/**
 * Read an OpenRouter chat-completions stream (`stream: true`).
 *
 * The body is OpenAI-style server-sent events: `data: {json}` lines whose
 * `choices[0].delta.content` carries the next piece of the reply, `: …`
 * keep-alive comments (OpenRouter sends `: OPENROUTER PROCESSING` while a
 * model spins up), blank separator lines, and a closing `data: [DONE]`.
 * Network chunks do not line up with events — a line, or the JSON inside it,
 * can be split across reads — so input is buffered up to each newline.
 *
 * `onDelta` fires for every content fragment as it arrives; the promise
 * resolves with the whole reply. An `error` object sent mid-stream (a provider
 * failing after the response has started) rejects with its message.
 */

type StreamEvent = { done: true } | { done: false; text: string } | null

const parseLine = (raw: string): StreamEvent => {
  const line = raw.trim()
  // Comments (keep-alives) and blank separators carry nothing.
  if (!line.startsWith('data:')) return null
  const payload = line.slice(5).trim()
  if (payload === '[DONE]') return { done: true }
  if (!payload) return null

  let json: {
    error?: { message?: string }
    choices?: Array<{ delta?: { content?: string | null } }>
  }
  try {
    json = JSON.parse(payload)
  } catch {
    // A malformed event is dropped rather than failing the whole reply.
    return null
  }
  if (json.error) throw new Error(json.error.message || 'The model stopped with an error.')
  const text = json.choices?.[0]?.delta?.content
  return text ? { done: false, text } : null
}

export async function readChatStream(
  body: ReadableStream<Uint8Array>,
  onDelta: (text: string) => void,
): Promise<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let full = ''

  const take = (line: string): boolean => {
    const event = parseLine(line)
    if (!event) return false
    if (event.done) return true
    full += event.text
    onDelta(event.text)
    return false
  }

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let nl = buffer.indexOf('\n')
      while (nl !== -1) {
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        if (take(line)) return full
        nl = buffer.indexOf('\n')
      }
    }
    // A final event without a trailing newline.
    buffer += decoder.decode()
    take(buffer)
    return full
  } finally {
    reader.releaseLock()
  }
}

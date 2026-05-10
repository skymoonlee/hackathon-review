/**
 * Read an SSE-formatted ReadableStream<Uint8Array> from a fetch Response,
 * yielding parsed JSON objects (one per `data:` event).
 */
export async function* readSSE<T = unknown>(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<T, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (signal?.aborted) return;
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIdx: number;
      while ((sepIdx = buffer.indexOf("\n\n")) !== -1) {
        const event = buffer.slice(0, sepIdx);
        buffer = buffer.slice(sepIdx + 2);
        const lines = event.split(/\r?\n/);
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            yield JSON.parse(payload) as T;
          } catch {
            // ignore malformed
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

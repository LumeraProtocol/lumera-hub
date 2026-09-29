import { describe, expect, it } from 'vitest';

import { readChatStream } from './openrouter-stream';

/** A body that yields each string as its own network chunk. */
const streamOf = (chunks: string[]): ReadableStream<Uint8Array> => {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
};

const event = (content: string) =>
  `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;

describe('readChatStream', () => {
  it('emits each delta as it arrives and resolves with the whole reply', async () => {
    const deltas: string[] = [];
    const full = await readChatStream(
      streamOf([': OPENROUTER PROCESSING\n\n', event('Hel'), event('lo'), event(' **world**'), 'data: [DONE]\n\n']),
      (d) => deltas.push(d),
    );
    expect(deltas).toEqual(['Hel', 'lo', ' **world**']);
    expect(full).toBe('Hello **world**');
  });

  it('reassembles events split across network chunks, even mid-JSON', async () => {
    const whole = event('split ') + event('across reads') + 'data: [DONE]\n\n';
    // Cut into 7-byte pieces so lines and JSON break at arbitrary points.
    const pieces = whole.match(/[\s\S]{1,7}/g) ?? [];
    const deltas: string[] = [];
    const full = await readChatStream(streamOf(pieces), (d) => deltas.push(d));
    expect(full).toBe('split across reads');
    expect(deltas.join('')).toBe(full);
  });

  it('ignores role-only and empty deltas, and stops at [DONE]', async () => {
    const full = await readChatStream(
      streamOf([
        `data: ${JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] })}\n\n`,
        event('ok'),
        `data: ${JSON.stringify({ choices: [{ delta: { content: '' }, finish_reason: 'stop' }] })}\n\n`,
        'data: [DONE]\n\n',
        event('after done is ignored'),
      ]),
      () => undefined,
    );
    expect(full).toBe('ok');
  });

  it('keeps a final event that has no trailing newline', async () => {
    const full = await readChatStream(
      streamOf([event('first'), `data: ${JSON.stringify({ choices: [{ delta: { content: ' last' } }] })}`]),
      () => undefined,
    );
    expect(full).toBe('first last');
  });

  it('rejects with the provider message when an error arrives mid-stream', async () => {
    await expect(
      readChatStream(
        streamOf([event('partial'), `data: ${JSON.stringify({ error: { message: 'Provider returned error' } })}\n\n`]),
        () => undefined,
      ),
    ).rejects.toThrow('Provider returned error');
  });
});

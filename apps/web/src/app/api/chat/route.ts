// apps/web/src/app/api/chat/route.ts
import { NextResponse, type NextRequest } from 'next/server';

/*
 * Chat proxy for the /chat test page.
 *
 * The browser posts a conversation here; this attaches the OpenRouter key and
 * forwards it to openrouter.ai. The key is a server secret (OPENROUTER_API_KEY,
 * never a NEXT_PUBLIC value) so it never reaches the browser.
 *
 * This is a throwaway test surface, so the model is restricted to a small
 * allowlist of *free* models — a client cannot name an arbitrary paid model
 * and bill the key. openrouter/free (auto-routed) is the reliable default;
 * the named :free models share an upstream pool and 429 often.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KEY = process.env.OPENROUTER_API_KEY?.trim() || '';
const CONFIGURED = !!KEY;

/** Only zero-cost models. Keeps this test route from ever billing the key. */
const FREE_MODELS = [
  'openrouter/free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'z-ai/glm-5.2:free',
] as const;
const DEFAULT_MODEL = 'openrouter/free';

/** A single chat turn. Roles mirror the OpenAI/OpenRouter chat schema. */
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const MAX_MESSAGES = 60;
const MAX_CHARS = 24_000;

const isMessage = (m: unknown): m is ChatMessage =>
  !!m &&
  typeof m === 'object' &&
  ['system', 'user', 'assistant'].includes((m as ChatMessage).role) &&
  typeof (m as ChatMessage).content === 'string';

/** GET reports whether the chat proxy is wired up, and the free models on offer. */
export async function GET() {
  return NextResponse.json({ configured: CONFIGURED, models: FREE_MODELS, defaultModel: DEFAULT_MODEL });
}

export async function POST(request: NextRequest) {
  if (!CONFIGURED) {
    return NextResponse.json(
      { error: 'Chat is not configured on this deployment (no OPENROUTER_API_KEY).' },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { messages?: unknown; model?: unknown }
    | null;
  if (!body || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: 'Expected { messages: [...] }.' }, { status: 400 });
  }

  const messages = body.messages.filter(isMessage).slice(-MAX_MESSAGES);
  if (!messages.length) {
    return NextResponse.json({ error: 'No valid messages provided.' }, { status: 400 });
  }
  const total = messages.reduce((n, m) => n + m.content.length, 0);
  if (total > MAX_CHARS) {
    return NextResponse.json(
      { error: `Conversation too long for the test (${total} > ${MAX_CHARS} chars).` },
      { status: 413 },
    );
  }

  // Force a free model: honour the request only if it is on the allowlist.
  const requested = typeof body.model === 'string' ? body.model : '';
  const model = (FREE_MODELS as readonly string[]).includes(requested) ? requested : DEFAULT_MODEL;

  // The free pool 429s under load. Give OpenRouter the whole free allowlist as a
  // fallback chain (requested model first) — the models sit on different upstream
  // providers, so when one is throttled another usually answers — and retry once
  // after a short pause, since free-pool limits are frequently momentary.
  // OpenRouter caps the fallback list at 3, so take the requested model plus the
  // two next free options.
  const candidates = [model, ...FREE_MODELS.filter((m) => m !== model)].slice(0, 3);
  const callOnce = () =>
    fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
        // OpenRouter uses these for attribution/rankings; harmless if absent.
        'HTTP-Referer': 'https://hub.lumera.io',
        'X-Title': 'Lumera Hub chat',
      },
      body: JSON.stringify({ models: candidates, messages, max_tokens: 1024 }),
    });

  let res: Response;
  try {
    res = await callOnce();
    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 1500));
      res = await callOnce();
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach OpenRouter.' }, { status: 502 });
  }

  const text = await res.text();
  if (!res.ok) {
    // Hide our own credential problems as a 502; make a saturated free pool
    // legible so the page can suggest waiting or adding OpenRouter credits.
    if (res.status === 429) {
      return NextResponse.json(
        {
          error:
            'All free models are busy right now (OpenRouter free-pool rate limit). Wait a few seconds and retry — adding a little credit to the OpenRouter account raises the free limits.',
        },
        { status: 429 },
      );
    }
    let upstream = text;
    try {
      upstream = JSON.parse(text)?.error?.message || text;
    } catch {
      /* keep raw text */
    }
    const status = res.status === 401 || res.status === 403 ? 502 : res.status;
    return NextResponse.json(
      { error: status === 502 ? 'The chat provider rejected the operator key.' : upstream, model },
      { status },
    );
  }

  try {
    const json = JSON.parse(text);
    const reply: string = json?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ reply, model: json?.model || model, usage: json?.usage ?? null });
  } catch {
    return NextResponse.json({ error: 'Unexpected response from OpenRouter.' }, { status: 502 });
  }
}

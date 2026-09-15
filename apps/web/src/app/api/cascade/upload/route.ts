// apps/web/src/app/api/cascade/upload/route.ts
import { NextResponse, type NextRequest } from 'next/server';

import { CASCADE_API_URL } from '@/contants/network';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/*
 * Upload a file to Cascade through the operator's gateway.
 *
 * The browser posts a file here; this attaches the operator's bearer key and
 * forwards it to api.lumera.help/upload, then hands back the `action_id`. The
 * key is a server secret (LUMERA_API_KEY) — never a NEXT_PUBLIC value — so it
 * never reaches the browser. Downloads and receipts need no key, so those go
 * straight to the gateway from the client; only this write is proxied.
 *
 * The key is operator-issued and ulume-capped, and it is the account that pays
 * for every inscription, so this route rate-limits per IP to keep the form
 * from draining the budget.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KEY = process.env.LUMERA_API_KEY?.trim() || '';
const CONFIGURED = !!KEY;

/** Uploads per IP per hour. Generous for real use, a ceiling on abuse. */
const MAX_PER_HOUR = Number(process.env.CASCADE_UPLOAD_MAX_PER_HOUR) || 20;
const HOUR_MS = 60 * 60 * 1000;

/*
 * The proxy buffers the whole file in memory (FormData), and Vercel functions
 * accept request bodies up to 100 MB, so cap there. Larger artifacts would need
 * a streamed or direct-to-gateway upload; the gateway itself allows 1000 MB.
 */
const MAX_BYTES = Number(process.env.CASCADE_UPLOAD_MAX_BYTES) || 100 * 1024 * 1024;

/** GET reports whether uploads can be made from this deployment. */
export async function GET() {
  return NextResponse.json({ configured: CONFIGURED, maxBytes: MAX_BYTES });
}

export async function POST(request: NextRequest) {
  if (!CONFIGURED) {
    return NextResponse.json(
      { error: 'File sharing is not configured on this deployment yet.' },
      { status: 503 },
    );
  }

  const ip = getClientIP(request);
  if (!checkRateLimit(`cascade-upload:${ip}`, MAX_PER_HOUR, HOUR_MS)) {
    return NextResponse.json(
      { error: 'Too many uploads from here. Try again later.' },
      { status: 429 },
    );
  }

  // Read the multipart body through a minimal interface: the runtime's parsed
  // FormData type does not line up with the ambient one, so `.get` is accessed
  // structurally rather than through the mismatched declaration.
  type IncomingForm = { get(name: string): unknown };
  const form = (await request.formData().catch(() => null)) as IncomingForm | null;
  if (!form) {
    return NextResponse.json({ error: 'Expected a multipart form with a file.' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `That file is larger than the ${Math.round(MAX_BYTES / (1024 * 1024))} MB limit.` },
      { status: 413 },
    );
  }

  const forwarded = new FormData();
  forwarded.append('file', file, file.name);
  const label = form.get('label');
  if (typeof label === 'string' && label.trim()) forwarded.append('label', label.trim().slice(0, 200));

  let res: Response;
  try {
    res = await fetch(`${CASCADE_API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}` },
      body: forwarded,
    });
  } catch {
    return NextResponse.json({ error: 'Could not reach the storage gateway.' }, { status: 502 });
  }

  const text = await res.text();
  if (!res.ok) {
    // A 401/403 here means our key is bad or out of budget — a server-side
    // misconfiguration, not the caller's fault, so it is not surfaced as-is.
    const status = res.status === 401 || res.status === 403 ? 502 : res.status;
    const message =
      status === 502
        ? 'The storage gateway rejected the operator key. Please try again later.'
        : text || `Upload failed (${res.status}).`;
    return NextResponse.json({ error: message }, { status });
  }

  try {
    return NextResponse.json(JSON.parse(text));
  } catch {
    return NextResponse.json({ error: 'Unexpected gateway response.' }, { status: 502 });
  }
}

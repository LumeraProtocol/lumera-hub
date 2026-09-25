// apps/web/src/app/api/cascade/upload-folder/route.ts
import { NextResponse, type NextRequest } from 'next/server';

import { CASCADE_API_URL } from '@/contants/network';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';

/*
 * Upload several files as ONE Cascade archive, through the operator gateway.
 *
 * The browser posts multiple `files` parts (each part's filename is its
 * archive-relative path); this attaches the operator key and forwards them to
 * api.lumera.help/upload/folder with mode=archive, so the whole set becomes one
 * inscription — one action_id, one fee — with every entry retrievable at
 * /download/{action_id}/{path}. Used by /chat to store conversation.json plus
 * the user's attachments together. Same key + rate-limit discipline as /upload.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KEY = process.env.LUMERA_API_KEY?.trim() || '';
const CONFIGURED = !!KEY;

const MAX_PER_HOUR = Number(process.env.CASCADE_UPLOAD_MAX_PER_HOUR) || 20;
const HOUR_MS = 60 * 60 * 1000;
const MAX_BYTES = Number(process.env.CASCADE_UPLOAD_MAX_BYTES) || 100 * 1024 * 1024;
const MAX_FILES = 50;

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

  // The runtime's parsed FormData type does not line up with the ambient one,
  // so it is accessed structurally.
  type IncomingForm = { getAll(name: string): unknown[]; get(name: string): unknown };
  const form = (await request.formData().catch(() => null)) as IncomingForm | null;
  if (!form) {
    return NextResponse.json({ error: 'Expected a multipart form with files.' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) {
    return NextResponse.json({ error: 'No files provided.' }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return NextResponse.json({ error: `Too many files (max ${MAX_FILES}).` }, { status: 400 });
  }
  const total = files.reduce((n, f) => n + f.size, 0);
  if (total > MAX_BYTES) {
    return NextResponse.json(
      { error: `Those files total more than the ${Math.round(MAX_BYTES / (1024 * 1024))} MB limit.` },
      { status: 413 },
    );
  }

  // The gateway wants fields before files. `archive` = one action for the whole
  // set; the caller may override to `individual` (one action per file).
  const forwarded = new FormData();
  const mode = form.get('mode');
  forwarded.append('mode', typeof mode === 'string' && mode === 'individual' ? 'individual' : 'archive');
  const label = form.get('label');
  if (typeof label === 'string' && label.trim()) forwarded.append('label', label.trim().slice(0, 200));
  for (const f of files) forwarded.append('files', f, f.name);

  let res: Response;
  try {
    res = await fetch(`${CASCADE_API_URL}/upload/folder`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${KEY}` },
      body: forwarded,
    });
  } catch {
    return NextResponse.json({ error: 'Could not reach the storage gateway.' }, { status: 502 });
  }

  const text = await res.text();
  if (!res.ok) {
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

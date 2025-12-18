// api/supernode/route.ts
import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

import * as instance from '@/utils/api';
import { IMarker } from '@/hooks/useCascade';
import { supernodeListSchema, SupernodeItem } from '@/app/api/supernode/validators';

const bodySchema = z.object({
  supernodes: supernodeListSchema,
});

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // ~ 1 minute
const MAX_REQUESTS = Number(process.env.NEXT_PUBLIC_MAX_REQUESTS || 10); // ~ 10/minute

function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
         request.headers.get('x-real-ip') ||
         '127.0.0.1';
}

function checkRateLimit(ip: string, maxRequests: number, windowMs: number): boolean {
  const key = `${ip}:${windowMs}`;
  const now = Date.now();
  const userData = rateLimitMap.get(key) || { count: 0, resetTime: now + windowMs };

  if (now > userData.resetTime) {
    // Reset counter
    userData.count = 1;
    userData.resetTime = now + windowMs;
  } else {
    userData.count++;
  }

  rateLimitMap.set(key, userData);

  return userData.count <= maxRequests;
}

const filePath = path.join(process.cwd(), 'data', 'supernodes.json');

async function readFile() {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return {
      status: true,
      supernodes: JSON.parse(data),
      message: null,
    };
  } catch (error) {
    return {
      status: false,
      supernodes: [],
      message: (error as Error)?.message ||  'An unknown error occurred.'
    };
  }
}

async function writeFile(content: IMarker[]) {
  try {
    await fs.writeFile(filePath, JSON.stringify(content, null, 2), 'utf8');
    return { success: true, data: content };
  } catch {
    return { success: false, error: 'Cannot write file' };
  }
}

async function fetchLocationFromIpWho(ip: string) {
  try {
    const { data } = await instance.getExternal(`https://ipwho.is/${ip}`);
    return {
      latitude: data?.latitude || null,
      longitude: data?.longitude || null,
      subdivision: data?.capital || null,
      city: data?.city || null,
      country: data?.country || null,
      continent: data?.continent || null,
      country_code: data?.country_code || null,
    };
  } catch (error) {
    console.error('Fetch location from IpWho Error:', error);
    return null;
  }
}

async function readAndUpdateSupernode(supernodes: SupernodeItem[]) {
  if (!supernodes?.length) {
    throw new Error("Supernodes list cannot be empty.");
  }
  try {
    const data = await readFile();
    const currentSupernodes: IMarker[] = data.supernodes;
    const results: IMarker[] = [];
    let isUpdate = false;
    for (const item of supernodes) {
      try {
        const supernode = currentSupernodes.find((s) => s.address === item.ip_address);
        if (!supernode) {
          const address = item.ip_address;
          const ip = address.split(':')[0];
          const data = await fetchLocationFromIpWho(ip);
          if (data?.latitude && data?.longitude) {
            results.push({
              latLng: [data.latitude, data.longitude],
              name: data?.city || '',
              continent: data?.continent || '',
              country: data?.country || '',
              country_code: data?.country_code || '',
              subdivision: data?.subdivision || '',
              city: data?.city || '',
              supernodeAccount: item.supernode_account,
              validatorAddress: item.validator_address,
              validatorMoniker: item.validator_moniker,
              address,
              p2pPort: item.p2p_port.toString(),
            });
          }
          isUpdate = true;
        } else {
          results.push(supernode);
        }
      } catch {
        // noop
      }
    }
    if (isUpdate) {
      await writeFile(results);
    }
    return results;
  } catch (error) {
    throw new Error((error as Error).message)
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIP(request);

  if (!checkRateLimit(ip, MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(RATE_LIMIT_WINDOW_MS / 1000 / 60)} minutes.` },
      {
        status: 429,
      }
    );
  }

  try {
    const body = await request.json();
    const validatedBody = bodySchema.parse(body);
    const { supernodes } = validatedBody;

    const data = await readAndUpdateSupernode(supernodes);
    return NextResponse.json({
      status: true,
      supernodes: data,
    });
  } catch (error) {
    console.error('API Error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid data',
          details: error.issues.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: (error as Error).message || 'An unknown error occurred.' },
      { status: 500 }
    );
  }
}

// app/api/snag/users/route.ts
import { NextResponse } from 'next/server';

import client from '@/lib/snag';

export async function GET() {
  try {
    const results = await client.get('api/users');
    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

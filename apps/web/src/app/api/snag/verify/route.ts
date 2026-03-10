// app/api/snag/users/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('body', body);
    return NextResponse.json({
      status: true,
      body,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

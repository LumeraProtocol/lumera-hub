// app/api/snag/save-loyalty-rule-config/route.ts

import { NextResponse, NextRequest } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    const result = await snagLoyaltyRepo.save(body);

    return NextResponse.json({
      status: true,
      result,
    });
  } catch (error) {
    console.log('error', error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

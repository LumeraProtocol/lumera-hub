// app/api/snag/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    await snagLoyaltyRepo.createQueryBuilder().delete().where("1 = 1").execute();

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

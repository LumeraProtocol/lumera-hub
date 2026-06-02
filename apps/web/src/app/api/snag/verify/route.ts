// app/api/snag/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);

    const user = await snagUserRepo.createQueryBuilder()
      .select('snagAddress, lumeraAddress, userId')
      .where('snagAddress = :snagAddress', { snagAddress: body.snagAddress })
      .getRawOne();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found!',
          type: 'not-found'
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: true,
      body,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

// app/api/snag/remove-loyalty-rules/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID is required!',
        },
        { status: 400 }
      );
    }
    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    await client.loyalty.rules.delete(body?.id);

    await snagLoyaltyRepo.createQueryBuilder().delete().where('id = :id', { id: body.id }).execute();

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

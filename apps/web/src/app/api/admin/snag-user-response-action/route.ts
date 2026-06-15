// app/api/admin/trackings/save-wallet-connect/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { snagResponseSchema } from '@/schemas/snagResponseSchema';
import { SnagUserResponse } from '@/entities/SnagUserResponse';
import client from '@/lib/snag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = snagResponseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const data = validation.data;
    const dataSource = await getDataSource();
    const snagUserResponseRepo = dataSource.getRepository(SnagUserResponse);

    await snagUserResponseRepo.save({
      id: data.id,
      status: data.type,
      adminUserId: data.adminUserId,
    });
    console.log('data.type', data.type);
    if (data.type === 'approved') {
      await client.post(`/api/loyalty/rules/${data.loyaltyRuleId}/complete`, {
        body: {
          userId: data.userId,
        },
      });
    }

    return NextResponse.json(
      { success: true, message: 'User response save successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('User response error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: (error as Error).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

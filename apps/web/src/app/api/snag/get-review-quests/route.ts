// app/api/admin/get-loyalty-sections/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagUserResponse } from '@/entities/SnagUserResponse';
import { SnagUser } from '@/entities/SnagUser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.snagAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }

    if (!body?.loyaltyRuleID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest ID is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const snagUserResponseRepo = dataSource.getRepository(SnagUserResponse);
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

    const responses = await snagUserResponseRepo.createQueryBuilder()
      .select([
        'id',
        'loyaltyRuleId',
        'status',
        'content',
        'created_at',
      ])
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress: user.lumeraAddress })
      .andWhere('loyaltyRuleId = :loyaltyRuleId', { loyaltyRuleId: body.loyaltyRuleID })
      .orderBy('created_at', 'DESC')
      .getRawMany();

    return NextResponse.json({
      success: true,
      responses,
    });
  } catch (error) {
    console.error('Get Loyalty sections error:', error);
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

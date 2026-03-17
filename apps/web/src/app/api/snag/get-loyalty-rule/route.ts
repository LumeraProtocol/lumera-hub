// app/api/admin/trackings/get-loyalty-rules/route.ts

import { NextResponse, NextRequest } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    const searchParams = req.nextUrl.searchParams;
    const loyaltyRuleId = searchParams.get("loyaltyRuleId") || '';
    if (!loyaltyRuleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Loyalty Rule Id is required!',
        },
        { status: 400 }
      );
    }

    const loyaltyRule = await snagLoyaltyRepo
      .createQueryBuilder()
      .select('*')
      .where('id = :loyaltyRuleId', { loyaltyRuleId })
      .getRawOne();

    return NextResponse.json({
      success: true,
      loyaltyRule,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
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

// app/api/admin/chart/user/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Tracking } from '@/entities/Tracking';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const trackingRepo = dataSource.getRepository(Tracking);

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || dayjs().format('YYYY-MM-DD');
    const endDate = searchParams.get("endDate") || dayjs().format('YYYY-MM-DD');

    const items = await trackingRepo.createQueryBuilder()
      .select('*')
      .where('date >= :startDate', { startDate })
      .andWhere('date <= :endDate', { endDate })
      .orderBy('date', 'ASC')
      .getRawMany();

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
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

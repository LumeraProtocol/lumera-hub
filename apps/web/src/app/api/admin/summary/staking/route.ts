// app/api/admin/summary/staking/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Staking } from '@/entities/Staking';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const stakingRepo = dataSource.getRepository(Staking);

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || dayjs().format('YYYY-MM-DD');
    const endDate = searchParams.get("endDate") || dayjs().format('YYYY-MM-DD');

    const item = await stakingRepo.createQueryBuilder()
      .select('SUM(delegate)', 'delegate')
      .addSelect('SUM(redelegate)', 'redelegate')
      .addSelect('SUM(unstaking)', 'unstaking')
      .where('date >= :startDate', { startDate })
      .andWhere('date <= :endDate', { endDate })
      .orderBy('date', 'DESC')
      .getRawOne();

    return NextResponse.json({
      success: true,
      delegate: item.delegate,
      redelegate: item.redelegate,
      unstaking: item.unstaking,
    });
  } catch (error) {
    console.error('Error fetching staking:', error);
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

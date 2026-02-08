// app/api/admin/summary/wallets/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Wallet } from '@/entities/Wallet';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const walletRepo = dataSource.getRepository(Wallet);

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || dayjs().format('YYYY-MM-DD');
    const endDate = searchParams.get("endDate") || dayjs().format('YYYY-MM-DD');

    const lastItem = await walletRepo.createQueryBuilder()
      .select('new_address')
      .where('date = :endDate', { endDate })
      .orderBy('date', 'DESC')
      .getRawOne();
    const item = await walletRepo.createQueryBuilder()
      .select('SUM(total_address)', 'total')
      .where('date >= :startDate', { startDate })
      .andWhere('date <= :endDate', { endDate })
      .orderBy('date', 'DESC')
      .getRawOne();

    return NextResponse.json({
      success: true,
      new: lastItem?.new_address || 0,
      total: item?.total || 0,
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

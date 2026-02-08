// app/api/admin/chart/user/route.ts

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

    const items = await walletRepo.createQueryBuilder()
      .select('total_address')
      .addSelect('new_address')
      .addSelect('date')
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

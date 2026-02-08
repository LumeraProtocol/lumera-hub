// app/api/admin/chart/cascade/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Cascade } from '@/entities/Cascade';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const cascadeRepo = dataSource.getRepository(Cascade);

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || dayjs().format('YYYY-MM-DD');
    const endDate = searchParams.get("endDate") || dayjs().format('YYYY-MM-DD');

    const items = await cascadeRepo.createQueryBuilder()
      .select('upload')
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
    console.error('Error fetching cascade:', error);
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

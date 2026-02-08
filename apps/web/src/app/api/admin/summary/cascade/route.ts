// app/api/admin/summary/cascade/route.ts

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

    const item = await cascadeRepo.createQueryBuilder()
      .select('SUM(upload)', 'upload')
      .addSelect('SUM(image)', 'image')
      .addSelect('SUM(video)', 'video')
      .addSelect('SUM(program)', 'program')
      .addSelect('SUM(archive)', 'archive')
      .addSelect('SUM(document)', 'document')
      .addSelect('SUM(other)', 'other')
      .addSelect('SUM(total_price)', 'total_price')
      .addSelect('SUM(total_fee)', 'total_fee')
      .where('date >= :startDate', { startDate })
      .andWhere('date <= :endDate', { endDate })
      .orderBy('date', 'DESC')
      .getRawOne();

    return NextResponse.json({
      success: true,
      upload: item.upload,
      image: item.image,
      video: item.video,
      program: item.program,
      archive: item.archive,
      document: item.document,
      other: item.other,
      total_price: item.total_price,
      total_fee: item.total_fee,
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

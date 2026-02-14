// app/api/admin/trackings/get-retention-rate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';

interface IWeek {
  hash: string;
  week: string;
  year: string;
  start_date: string;
  end_date: string;
}

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || dayjs().format('YYYY-MM-DD');
    const endDate = searchParams.get("endDate") || dayjs().format('YYYY-MM-DD');

    const weekResult = await dataSource.query(
      `
      SELECT
        hash,
        week,
        year,
        start_date,
        end_date
      FROM retention_rate_week
      WHERE start_date >= ? AND end_date <= ?
      `,
      [startDate, endDate]
    );
    const weekHash = weekResult?.map((item: IWeek) => item.hash).join("', '");
    console.log('weekHash', weekHash)
    const weekDetailsResult = await dataSource.query(
      `
      SELECT
        id,
        week_hash,
        week,
        year,
        total_activation
      FROM retention_rate_week_details
      WHERE week_hash IN ('${weekHash}')
      ORDER BY week_hash, year, week
      `
    );

    return NextResponse.json({
      success: true,
      items: weekResult,
      details: weekDetailsResult,
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

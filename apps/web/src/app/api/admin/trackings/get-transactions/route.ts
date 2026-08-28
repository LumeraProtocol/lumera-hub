// app/api/admin/trackings/get-transactions/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'startDate or endDate is required.',
        },
        { status: 400 }
      );
    }

    const items = await dataSource.query(
      `
      SELECT *
      FROM tracking
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
      `,
      [startDate, endDate]
    );

    return NextResponse.json({
      success: true,
      items,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
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

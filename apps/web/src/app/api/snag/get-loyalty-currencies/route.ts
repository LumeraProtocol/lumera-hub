// app/api/admin/get-loyalty-currencies/route.ts

import { NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagCurrency } from '@/entities/SnagCurrency';

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const snagCurrencyRepo = dataSource.getRepository(SnagCurrency);

    const currencies = await snagCurrencyRepo
      .createQueryBuilder()
      .select('id')
      .addSelect('name')
      .orderBy('name')
      .getRawMany();

    return NextResponse.json({
      success: true,
      currencies,
    });
  } catch (error) {
    console.error('Get Loyalty Currencies error:', error);
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

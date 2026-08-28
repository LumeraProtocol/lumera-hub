// app/api/admin/get-loyalty-sections/route.ts

import { NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagSection } from '@/entities/SnagSection';

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const snagSectionRepo = dataSource.getRepository(SnagSection);

    const sections = await snagSectionRepo
      .createQueryBuilder()
      .select('id')
      .addSelect('name')
      .orderBy('name')
      .getRawMany();

    return NextResponse.json({
      success: true,
      sections,
    });
  } catch (error) {
    console.error('Get Loyalty sections error:', error);
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

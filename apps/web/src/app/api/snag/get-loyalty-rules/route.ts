/* eslint-disable @typescript-eslint/no-explicit-any */

// app/api/admin/trackings/get-loyalty-rules/route.ts

import { NextResponse, NextRequest } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 20), 100);
    const search = searchParams.get("search")?.trim() || "";
    const sprintID = searchParams.get("sprintID")?.trim() || "";

    const skip = (page - 1) * limit;

    const queryBuilder = snagLoyaltyRepo
      .createQueryBuilder()
      .select('*')
      .where('sprintID = :sprintID', { sprintID })
      .orderBy('startTime');
    const totalQueryBuilder = snagLoyaltyRepo
      .createQueryBuilder()
      .select('COUNT(1)', 'total')
      .where('sprintID = :sprintID', { sprintID })

    if (search) {
      queryBuilder.andWhere("name LIKE :search", { search: `%${search}%` });
      totalQueryBuilder.andWhere("name LIKE :search", { search: `%${search}%` });
    }
    const loyaltyRules = await queryBuilder
      .skip(skip)
      .take(limit)
      .getRawMany();

    const totalItems = await totalQueryBuilder.getRawOne();

    return NextResponse.json({
      success: true,
      loyaltyRules,
      totalItems: Number(totalItems?.total || 0)
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
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

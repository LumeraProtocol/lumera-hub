// app/api/admin/wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import jwt from 'jsonwebtoken';

import { getDataSource } from '@/lib/data-source';
import { SnagUserResponse } from '@/entities/SnagUserResponse';


export async function GET(req: NextRequest) {
  // // API protected
  // const authHeader = req.headers.get('authorization');
  // if (!authHeader || !authHeader.startsWith('Bearer ')) {
  //   return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  // }

  // const token = authHeader.split(' ')[1];
  // try {
  //   jwt.verify(token, process.env.JWT_SECRET!);
  // } catch {
  //   return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  // }

  try {
    const dataSource = await getDataSource();
    const snagUserResponseRepo = dataSource.getRepository(SnagUserResponse);

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 20), 100);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";

    const skip = (page - 1) * limit;

    // Query builder
    const queryBuilder = snagUserResponseRepo.createQueryBuilder("sur")
      .leftJoinAndSelect('sur.loyaltyRule', 'sl')
      .select('sur.id', 'id')
      .addSelect('sur.loyaltyRuleId', 'loyaltyRuleId')
      .addSelect('sur.content', 'content')
      .addSelect('sur.userId', 'userId')
      .addSelect('sur.lumeraAddress', 'lumeraAddress')
      .addSelect('sur.snagAddress', 'snagAddress')
      .addSelect('sur.status', 'status')
      .addSelect('sur.adminUserId', 'adminUserId')
      .addSelect('sur.created_at', 'created_at')
      .addSelect('sur.updated_at', 'updated_at')
      .addSelect('sl.name', 'name')
      .addSelect('sl.amount', 'amount')
      .addSelect('sl.config', 'config')
      .addSelect(
        subQuery => subQuery
          .select("COUNT(1)")
          .from("snag_user_response", "sur2")
          .where("sur2.loyaltyRuleId = sur.loyaltyRuleId")
          .andWhere("sur2.lumeraAddress = sur.lumeraAddress")
          .andWhere("sur2.status = 'approved'"),
        "claims"
      );

    if (status) {
      queryBuilder.andWhere('sur.status = :status', { status });
    }

    if (search) {
      queryBuilder.andWhere('sl.name ILIKE :loyaltyName', {
        loyaltyName: `%${search}%`,
      });
    }

    const data = await queryBuilder
      .orderBy('sur.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawMany();

    const total = await queryBuilder.getCount();

    return NextResponse.json({
      success: true,
      items: data,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit),
      },
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

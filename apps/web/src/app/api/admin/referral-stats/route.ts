// app/api/admin/referral-stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
// import jwt from 'jsonwebtoken';

import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagRefer } from '@/entities/SnagRefer';


export async function GET(req: NextRequest) {
  // API protected
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
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagReferRepo = dataSource.getRepository(SnagRefer);

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 20), 100);

    const skip = (page - 1) * limit;

    // Query builder
    const queryBuilder = snagUserRepo.createQueryBuilder()
      .select('snagAddress')
      .addSelect('lumeraAddress')
      .addSelect('created_at');

    const data = await queryBuilder
      .orderBy('created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getRawMany();

    const total = await queryBuilder.getCount();

    const lumeraAddresses = data?.map((d) => d.lumeraAddress) || [];
    let refers = [];
    if (lumeraAddresses?.length) {
      refers = await snagReferRepo.createQueryBuilder()
        .select('lumeraAddress')
        .addSelect('referAddress')
        .addSelect('claim')
        .addSelect('claimCascade')
        .where('referAddress IN (:...lumeraAddresses)', { lumeraAddresses })
        .orderBy('created_at', 'DESC')
        .getRawMany();
    }

    return NextResponse.json({
      success: true,
      items: data,
      refers,
      maxRefer: 10,
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

// app/api/snag/redelegate-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { SnagRefer } from '@/entities/SnagRefer';

dayjs.extend(utc);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.snagAddress && !body.lumeraAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required!',
        },
        { status: 400 }
      );
    }

    if (!body?.loyaltyRuleID && !body.lumeraAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest ID is required!',
        },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    const snagReferRepo = dataSource.getRepository(SnagRefer);

    const loyaltyRule = await snagLoyaltyRepo
      .createQueryBuilder()
      .select('id')
      .addSelect('config')
      .addSelect('startTime')
      .addSelect('endTime')
      .addSelect('amount')
      .where('id = :loyaltyRuleID', { loyaltyRuleID: body.loyaltyRuleID })
      .getRawOne();

    if (!loyaltyRule && !body.lumeraAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest not found!',
        },
        { status: 400 }
      );
    }
    let maxRefer = 10;
    if (loyaltyRule?.config) {
      const config = JSON.parse(loyaltyRule.config);
      maxRefer = config.referralLink.maxRefer;
    }

    let user = await snagUserRepo.createQueryBuilder()
      .select('snagAddress, lumeraAddress, userId')
      .where('snagAddress = :snagAddress', { snagAddress: body.snagAddress })
      .getRawOne();
    if (!body.snagAddress) {
      user = await snagUserRepo.createQueryBuilder()
        .select('snagAddress, lumeraAddress, userId')
        .where('lumeraAddress = :lumeraAddress', { lumeraAddress: body.lumeraAddress })
        .getRawOne();
    }

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found!',
        },
        { status: 400 }
      );
    }

    const refers = await snagReferRepo.createQueryBuilder()
      .select('lumeraAddress')
      .addSelect('referAddress')
      .addSelect('claim')
      .addSelect('claimCascade')
      .addSelect('created_at')
      .where('referAddress = :referAddress', { referAddress: user.lumeraAddress })
      .orderBy('created_at', 'DESC')
      .getRawMany();

    let totalClaim = await snagReferRepo
        .createQueryBuilder()
        .select('lumeraAddress')
        .where('referAddress = :referAddress', { referAddress: user.lumeraAddress })
        .andWhere("claim = '1'")
        .getCount();

    if (body?.type === 'cascade') {
        totalClaim = await snagReferRepo
          .createQueryBuilder()
          .select('lumeraAddress')
          .where('referAddress = :referAddress', { referAddress: user.lumeraAddress })
          .andWhere("claimCascade = '1'")
          .getCount();
    }
    return NextResponse.json({
      status: true,
      referCode: user.lumeraAddress,
      point: loyaltyRule?.amount || 50,
      maxRefer,
      refers,
      totalClaim: totalClaim || 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

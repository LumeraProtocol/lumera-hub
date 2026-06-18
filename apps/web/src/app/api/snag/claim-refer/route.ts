/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/balance-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { SnagRefer } from '@/entities/SnagRefer';
import client from '@/lib/snag';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    if (!body?.userAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required!',
        },
        { status: 400 }
      );
    }

    if (!body?.type) {
      return NextResponse.json(
        {
          success: false,
          error: 'Type is required!',
        },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    const snagReferRepo = dataSource.getRepository(SnagRefer);

    const refer = await snagReferRepo.createQueryBuilder()
        .select('referAddress, lumeraAddress')
        .where('lumeraAddress = :lumeraAddress', { lumeraAddress: body.userAddress })
        .getRawOne();

    if (!refer) {
      return NextResponse.json(
        {
          success: false,
          error: 'Refer user not found!',
          type: 'not-found'
        },
        { status: 400 }
      );
    }

    const user = await snagUserRepo.createQueryBuilder()
      .select('snagAddress, lumeraAddress, userId')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress: refer.referAddress })
      .getRawOne();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found!',
          type: 'not-found'
        },
        { status: 400 }
      );
    }

    const buildSql = snagLoyaltyRepo
      .createQueryBuilder()
      .select('id')
      .addSelect('config')
      .addSelect('startTime')
      .addSelect('endTime')
      .where("config LIKE '%referralLink%'")

    if (body.type === 'casacde') {
      buildSql.andWhere("name LIKE '%uploads to Cascade%'")
      buildSql.andWhere("name LIKE '%Invite%'");
    } else {
      buildSql.andWhere("name LIKE '%connects wallet%'")
      buildSql.andWhere("name LIKE '%Invite%'");
    }

    const loyaltyRule = await buildSql.getRawOne();

    if (!loyaltyRule?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest ID is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }
    let limitClaim = 10;
    let totalClaim = await snagReferRepo
        .createQueryBuilder()
        .select('lumeraAddress')
        .where('referAddress = :referAddress', { referAddress: user.lumeraAddress })
        .andWhere("claim = '1'")
        .getCount();
    if (body.type === 'casacde') {
      totalClaim = await snagReferRepo
        .createQueryBuilder()
        .select('lumeraAddress')
        .where('referAddress = :referAddress', { referAddress: user.lumeraAddress })
        .andWhere("claimCascade = '1'")
        .getCount();
      limitClaim = 5;
    }

    if (totalClaim < limitClaim) {
      try {
        await client.post(`/api/loyalty/rules/${loyaltyRule?.id}/complete`, {
          body: {
            userId: user.userId,
          },
        });
        if (body.type === 'casacde') {
          await snagReferRepo.save({
            lumeraAddress: body?.userAddress,
            claimCascade: 1,
          });
        } else {
          await snagReferRepo.save({
            lumeraAddress: body?.userAddress,
            claim: 1,
          });
        }
      } catch (error) {
        console.error(new Date(), `Auto complete error. userAddress: ${body?.userAddress}, type: ${body?.type}, loyaltyRuleID: ${loyaltyRule?.id}, userId: ${user.userId}. Error details: `, JSON.stringify(error));
        return NextResponse.json({
          error: (error as Error).message,
        }, {
          status: 500,
        });
      }
    }


    return NextResponse.json({
      status: true,
    });
  } catch (error) {
    console.error(new Date(), `Claim refer error userAddress: ${body?.userAddress}, type: ${body?.type}. Error details: `, JSON.stringify(error));
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

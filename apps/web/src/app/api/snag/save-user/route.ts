/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/save-user/route.ts

import { NextResponse, NextRequest } from 'next/server';

import client from '@/lib/snag';
import { getDataSource } from '@/lib/data-source';
import { snagUserSchema } from '@/schemas/snagUserSchema';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = snagUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const SnagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    const user: any = await client.get(`api/users?address=${data.snagAddress}`);
    const userId = user?.data[0]?.id || '';
    const existsUser = await snagUserRepo
    .createQueryBuilder()
    .select('snagAddress')
    .where('snagAddress = :snagAddress', { snagAddress: data.snagAddress })
    .getRawOne();

    if (existsUser?.snagAddress) {
      const loyaltyRule = await SnagLoyaltyRepo
        .createQueryBuilder()
        .select('id')
        .where('metadata LIKE :metadata', { metadata: `%snag/wallet/connect%` })
        .andWhere("type = 'external_rule'")
        .getRawOne();
      if (!loyaltyRule) {
        return NextResponse.json(
          {
            success: false,
            error: 'Loyalty Rule not found.',
          },
          { status: 400 }
        );
      }
      const loyaltyRuleId = loyaltyRule.id;
      if (userId && loyaltyRuleId) {
        try {
          await client.post(`/api/loyalty/rules/${loyaltyRuleId}/complete`, {
            body: {
              userId,
            },
          });
        } catch {
          // noop
        }
      }

      return NextResponse.json({
        status: true,
        result: null,
      });
    }

    const result = await snagUserRepo.save({
      lumeraAddress: data.lumeraAddress,
      snagAddress: data.snagAddress,
      userId: user?.data[0]?.id || ''
    });

    const loyaltyRule = await SnagLoyaltyRepo
      .createQueryBuilder()
      .select('id')
      .where('metadata LIKE :metadata', { metadata: `%snag/wallet/connect%` })
      .andWhere("type = 'external_rule'")
      .getRawOne();
    if (!loyaltyRule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Loyalty Rule not found.',
        },
        { status: 400 }
      );
    }
    const loyaltyRuleId = loyaltyRule.id;
    if (userId && loyaltyRuleId) {
      await client.post(`/api/loyalty/rules/${loyaltyRuleId}/complete`, {
        body: {
          userId,
        },
      });
    }

    return NextResponse.json({
      status: true,
      result,
    });
  } catch (error) {
    console.error('error', error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

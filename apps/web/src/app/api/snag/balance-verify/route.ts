// app/api/snag/balance-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body?.snagAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Address is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }

    if (!body?.loyaltyRuleID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest ID is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    const user = await snagUserRepo.createQueryBuilder()
      .select('snagAddress, lumeraAddress, userId')
      .where('snagAddress = :snagAddress', { snagAddress: body.snagAddress })
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

    const loyaltyRule = await snagLoyaltyRepo
      .createQueryBuilder()
      .select('id')
      .addSelect('config')
      .addSelect('startTime')
      .addSelect('endTime')
      .where('id = :loyaltyRuleID', { loyaltyRuleID: body.loyaltyRuleID })
      .getRawOne();

    if (!loyaltyRule) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest not found!',
          type: 'not-found'
        },
        { status: 400 }
      );
    }

    const loyaltyRuleId = loyaltyRule.id;
    const config = JSON.parse(loyaltyRule.config)
    if (!loyaltyRuleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest ID not found!',
          type: 'not-found'
        },
        { status: 400 }
      );
    }
    const { data } = await instance.getExternal(`${config.urlCheck}${user.lumeraAddress}`);
    const balances = data?.balances;
    if (!balances?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Balance not found!',
          type: 'not-found'
        },
        { status: 400 }
      );
    }

    let totalBalances = 0;
    for (const item of balances) {
      if (item.denom === 'ulume') {
        totalBalances += Number(item.amount);
      }
    }

    const configAmount =  Number(config.staked.amount) * 1000000;
    switch (config.condition) {
      case '>':
        if (totalBalances <= configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The amount is less the minimum requirement.`,
            },
            { status: 400 }
          );
        }
        break;
      case '<=':
        if (totalBalances > configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The amount is greater than the maximum requirement.`,
            },
            { status: 400 }
          );
        }
        break;
      case '<':
        if (totalBalances >= configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The amount is greater the maximum requirement.`,
            },
            { status: 400 }
          );
        }
        break;
      case '=':
        if (totalBalances !== configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The amount does not match the required.`,
            },
            { status: 400 }
          );
        }
        break;
      default:
        if (totalBalances < configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The amount is less than the minimum requirement.`,
            },
            { status: 400 }
          );
        }
        break;
    }

    await client.post(`/api/loyalty/rules/${loyaltyRuleId}/complete`, {
      body: {
        userId: user.userId,
      },
    });

    return NextResponse.json({
      status: true,
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

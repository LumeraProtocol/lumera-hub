/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/claim-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

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
        },
        { status: 400 }
      );
    }

    if (!body?.address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supernode address is required!',
        },
        { status: 400 }
      );
    }

    if (!body?.loyaltyRuleID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Loyalty Rule ID is required!',
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
          error: 'Loyalty Rule not found!',
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
          error: 'Loyalty ID not found!',
        },
        { status: 400 }
      );
    }
    const { data } = await instance.getExternal(config.urlCheck);
    const nodes = data?.nodes;
    if (!nodes?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Supernodes not found!',
        },
        { status: 400 }
      );
    }

    const validatorAddress = nodes.find((node: any) => node.validator_address === body.address);
    if (!validatorAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'The validator address does not exist in the supernode list.',
        },
        { status: 400 }
      );
    }

    if (validatorAddress.supernode_account !== user.lumeraAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account address does not match user.',
        },
        { status: 400 }
      );
    }

    const validators = await instance.getExternal(config.supernode.validatorUrl);
    if (!validators?.data?.validators?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validators not found!',
        },
        { status: 400 }
      );
    }

    const validator = validators?.data?.validators.find((v: any) => v.operator_address === validatorAddress.validator_address);
    if (!validator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validator not found!',
        },
        { status: 400 }
      );
    }

    const updateTime = validator.commission.update_time;
    const pastDate = dayjs(updateTime);
    const now = dayjs();
    const uptime = Number(config.supernode.days);
    const diff = now.diff(pastDate, 'day');

    switch (config.condition) {
      case '>':
        if (diff <= uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is than the minimum requirement',
            },
            { status: 400 }
          );
        }
        break;
      case '<=':
        if (diff > uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is greater than the minimum requirement',
            },
            { status: 400 }
          );
        }
        break;
      case '<':
        if (diff >= uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is greater the minimum requirement',
            },
            { status: 400 }
          );
        }
        break;
      case '=':
         if (diff !== uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) does not match the required',
            },
            { status: 400 }
          );
        }
        break;
      default:
        if (diff < uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is less than the minimum requirement',
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

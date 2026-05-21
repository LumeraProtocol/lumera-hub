/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/balance-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

dayjs.extend(utc);
dayjs.extend(weekday);

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
    const { data } = await instance.getExternal(`${config.urlCheck}${user.lumeraAddress}`);
    const delegations = data?.delegation_responses;
    if (!delegations?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Delegations not found!',
        },
        { status: 400 }
      );
    }

    const validatorsRes = await instance.getExternal(config.decentralizationStake.validatorUrl);
    if (!validatorsRes?.data?.validators?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validators not found!',
        },
        { status: 400 }
      );
    }
    let start = Number(config.decentralizationStake.rank);
    const rankCondition = config.decentralizationStake.condition;
    if (rankCondition === '>=') {
      start = start - 1;
    }
    const sortValidators = validatorsRes.data.validators.sort((a: any, b: any) => Number(b.tokens) - Number(a.tokens));
    const validators = sortValidators.slice(start, sortValidators.length);
    let totalBalances = 0;
    for (const validator of validators) {
      const items = delegations.filter((d: any) => d.delegation.validator_address === validator.operator_address);
      if (items.length) {
        for (const item of items) {
          const balance = item.balance;
          if (balance.denom === 'ulume') {
            totalBalances += Number(balance.amount);
          }
        }
      }
    }
    const configAmount =  Number(config.decentralizationStake.amount) * 1000000;
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

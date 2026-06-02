/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/balance-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

dayjs.extend(utc);

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
          error: 'Quest ID is required!',
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
    const { data } = await instance.getExternal(config.urlCheck.replace('{walletAddress}', user.lumeraAddress));
    const txResponses = data?.tx_responses;
    if (!txResponses?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transactions not found!',
        },
        { status: 400 }
      );
    }

    const startDate = dayjs.utc(loyaltyRule.startTime).format('YYYYMMDD');
    const endDate   = dayjs.utc(loyaltyRule.endTime).format('YYYYMMDD');

    const txsOfWeek = txResponses.filter((tx: any) => Number(dayjs.utc(tx.timestamp).format('YYYYMMDD')) >= Number(startDate) && Number(dayjs.utc(tx.timestamp).format('YYYYMMDD')) <= Number(endDate));
    const currentModules: string[] = [];
    const configModules = Number(config.interactModules.modules);
    outer: for (const item of txsOfWeek) {
      const messages = item.tx.body.messages;
      for (const mgs of messages) {
        const type = mgs['@type'];
        if (!currentModules.includes(type)) {
          currentModules.push(type);
          if (currentModules.length >= Number(configModules)) {
            break outer;
          }
        }
      }

    }
    const totalModules = currentModules.length;
    const remaining = configModules - totalModules;

    switch (config.condition) {
      case '>':
        if (totalModules <= configModules) {
          return NextResponse.json(
            {
              success: false,
              error: `You've sent ${totalModules} modules. Send ${remaining} more to complete the weekly goal!`,
            },
            { status: 400 }
          );
        }
        break;
      case '<=':
        if (totalModules > configModules) {
          return NextResponse.json(
            {
              success: false,
              error: `You have sent ${totalModules} modules. The maximum allowed is ${configModules} modules. Please send fewer modules.`,
            },
            { status: 400 }
          );
        }
        break;
      case '<':
        if (totalModules >= configModules) {
          return NextResponse.json(
            {
              success: false,
              error: `You have sent ${totalModules} modules. The maximum allowed is ${configModules} modules. Please send fewer transactions.`,
            },
            { status: 400 }
          );
        }
        break;
      case '=':
        if (totalModules !== configModules) {
          return NextResponse.json(
            {
              success: false,
              error: `You have sent ${totalModules} modules. Reach ${configModules} to complete the goal.`,
            },
            { status: 400 }
          );
        }
        break;
      default:
        if (totalModules < configModules) {
          return NextResponse.json(
            {
              success: false,
              error: `You've sent ${totalModules} modules. Send ${remaining} more to complete the weekly goal!`,
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

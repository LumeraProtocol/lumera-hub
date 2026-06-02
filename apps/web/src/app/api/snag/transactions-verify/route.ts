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

    const nowUTC = dayjs.utc();
    const startDate = nowUTC.weekday(1).startOf('day').format('YYYYMMDD');
    const endDate   = nowUTC.weekday(7).endOf('day').format('YYYYMMDD');

    let totalTransactions = txResponses.length;
    if (config.sendTransactions.type === 'weekly') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txsOfWeek = txResponses.filter((tx: any) => Number(dayjs.utc(tx.timestamp).format('YYYYMMDD')) >= Number(startDate) && Number(dayjs.utc(tx.timestamp).format('YYYYMMDD')) <= Number(endDate));
      totalTransactions = txsOfWeek.length;
    }
    const configTransactions = Number(config.sendTransactions.transactions);
    const remaining = configTransactions - totalTransactions;

    switch (config.condition) {
      case '>':
        if (totalTransactions <= configTransactions) {
          return NextResponse.json(
            {
              success: false,
              error: `You've sent ${totalTransactions} transactions this week. Send ${remaining} more to complete the weekly goal!`,
            },
            { status: 400 }
          );
        }
        break;
      case '<=':
        if (totalTransactions > configTransactions) {
          return NextResponse.json(
            {
              success: false,
              error: `You have sent ${totalTransactions} transactions this week. The maximum allowed is ${configTransactions} transactions. Please send fewer transactions.`,
            },
            { status: 400 }
          );
        }
        break;
      case '<':
        if (totalTransactions >= configTransactions) {
          return NextResponse.json(
            {
              success: false,
              error: `You have sent ${totalTransactions} transactions this week. The maximum allowed is ${configTransactions} transactions. Please send fewer transactions.`,
            },
            { status: 400 }
          );
        }
        break;
      case '=':
        if (totalTransactions !== configTransactions) {
          return NextResponse.json(
            {
              success: false,
              error: `You have sent ${totalTransactions} transactions this week. Reach ${configTransactions} to complete the goal.`,
            },
            { status: 400 }
          );
        }
        break;
      default:
        if (totalTransactions < configTransactions) {
          return NextResponse.json(
            {
              success: false,
              error: `You've sent ${totalTransactions} transactions this week. Send ${remaining} more to complete the weekly goal!`,
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

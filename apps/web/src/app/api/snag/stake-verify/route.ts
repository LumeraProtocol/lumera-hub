// app/api/snag/stake-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { SnagTransaction } from '@/entities/SnagTransaction';
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
          error: 'Loyalty Rule ID is required!',
        },
        { status: 400 }
      );
    }

    if (!body?.txHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction is required!',
        },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    const snagTransactionRepo = dataSource.getRepository(SnagTransaction);

    const transaction = await snagTransactionRepo
      .createQueryBuilder()
      .select('txHash')
      .where('txHash = :txHash', { txHash: body.txHash })
      .getRawOne();

    if (transaction?.txHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'This tx hash has already been used. Please use a different one.',
        },
        { status: 400 }
      );
    }

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
    const { data } = await instance.getExternal(`${config.urlCheck}${body.txHash}`);
    const txResponses = data?.tx_response;
    if (!txResponses?.txhash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found!',
        },
        { status: 400 }
      );
    }

    const message = txResponses.tx.body.messages[0];
    if (
      dayjs.utc(loyaltyRule.startTime).startOf('minute').valueOf() <= dayjs.utc(txResponses.timestamp).startOf('minute').valueOf() ||
      (loyaltyRule.endTime && dayjs.utc(loyaltyRule.endTime).startOf('minute').valueOf() >= dayjs.utc(txResponses.timestamp).startOf('minute').valueOf()) ||
      message?.["@type"] !== "/cosmos.staking.v1beta1.MsgDelegate" ||
      message?.validator_address !== config.staked.validator ||
      message?.delegator_address !== user.lumeraAddress
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction. Please use a different one.',
        },
        { status: 400 }
      );
    }
    const configAmount =  Number(config.staked.amount) / 1000000;
    switch (config.condition) {
      case '>':
        if ( Number(message?.amount.amount) <= configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The staked amount is less the minimum requirement.`,
            },
            { status: 400 }
          );
        }
        break;
      case '<=':
        if ( Number(message?.amount.amount) > configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The staked amount is greater than the maximum requirement.`,
            },
            { status: 400 }
          );
        }
        break;
      case '<':
        if ( Number(message?.amount.amount) >= configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The staked amount is greater the maximum requirement.`,
            },
            { status: 400 }
          );
        }
        break;
      case '=':
        if ( Number(message?.amount.amount) !== configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The staked amount does not match the required.`,
            },
            { status: 400 }
          );
        }
        break;
      default:
        if ( Number(message?.amount.amount) < configAmount) {
          return NextResponse.json(
            {
              success: false,
              error: `The staked amount is less than the minimum requirement.`,
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

    await snagTransactionRepo.save({
      txHash: txResponses?.txhash,
      loyaltyRuleId,
      userId: user.userId,
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

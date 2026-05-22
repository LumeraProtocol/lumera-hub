// app/api/snag/claim-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { SnagTransaction } from '@/entities/SnagTransaction';
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

    if (!body?.txHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Restake Transaction is required!',
        },
        { status: 400 }
      );
    }

    if (!body?.claimTxHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Claim transaction is required!',
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
          error: 'This restake tx hash has already been used. Please use a different one.',
        },
        { status: 400 }
      );
    }

    const claimTransaction = await snagTransactionRepo
      .createQueryBuilder()
      .select('txHash')
      .where('txHash = :txHash', { txHash: body.claimTxHash })
      .getRawOne();

    if (claimTransaction?.txHash) {
      return NextResponse.json(
        {
          success: false,
          error: 'This claim tx hash has already been used. Please use a different one.',
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
          error: 'Restake transaction not found!',
        },
        { status: 400 }
      );
    }

    const claimTxRes = await instance.getExternal(`${config.urlCheck}${body.claimTxHash}`);
    const claimTxResponses = claimTxRes.data?.tx_response;
    if (!claimTxResponses?.txhash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Claim transaction not found!',
        },
        { status: 400 }
      );
    }

    const nowUTC = dayjs.utc();
    const startDate = nowUTC.weekday(1).startOf('day').format('YYYYMMDD');
    const endDate   = nowUTC.weekday(7).endOf('day').format('YYYYMMDD');

    const message = claimTxResponses.tx.body.messages[0];
    if (
      Number(startDate) > Number(dayjs.utc(claimTxResponses.timestamp).format('YYYYMMDD')) ||
      Number(endDate) < Number(dayjs.utc(claimTxResponses.timestamp).format('YYYYMMDD'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid claim transaction time. Please use a different one.',
        },
        { status: 400 }
      );
    }
    if (
      message['@type'].indexOf('v1beta1.MsgWithdrawDelegatorReward') === -1 ||
      message?.delegator_address !== user.lumeraAddress
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid claim transaction. Please use a different one.',
        },
        { status: 400 }
      );
    }

    const reStakeMessage = txResponses.tx.body.messages[0];
    if (
      Number(startDate) > Number(dayjs.utc(txResponses.timestamp).format('YYYYMMDD')) ||
      Number(endDate) < Number(dayjs.utc(txResponses.timestamp).format('YYYYMMDD'))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid claim transaction time. Please use a different one.',
        },
        { status: 400 }
      );
    }
    if (
      reStakeMessage['@type'].indexOf('v1beta1.MsgBeginRedelegate') === -1 ||
      reStakeMessage?.delegator_address !== user.lumeraAddress
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid restake transaction. Please use a different one.',
        },
        { status: 400 }
      );
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

    await snagTransactionRepo.save({
      txHash: body.claimTxHash,
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

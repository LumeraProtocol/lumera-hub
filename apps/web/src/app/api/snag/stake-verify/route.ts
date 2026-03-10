/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as instance from '@/utils/api-server';

import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
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

    if (!body?.validator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validator is required!',
        },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);

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

    const loyaltyRuleIds: any = {
      'lumeravaloper1q498cczezvamq6qu72zd3dt6ng6c4p9pqfsefj': '5a4adfc4-8d8c-4722-8066-816e191825ec',
      'lumeravaloper1vpqr7jm2mh72zt9rkrd4dlkqdjjj7klg4gp6e3': '7a244320-1322-4b2e-a393-3eea7c329e65',
      'lumeravaloper13nwzm5dfd26ue74jr6sc39gyn3qze0rjspr93m': 'a84bcd4a-2d41-400a-9f64-74c40cec1ebe',
    }
    const loyaltyRuleId = loyaltyRuleIds[body.validator];
    if (!loyaltyRuleId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Loyalty ID not found!',
        },
        { status: 400 }
      );
    }

    const { data } = await instance.get(`/cosmos/tx/v1beta1/txs?query=message.sender=%27${user.lumeraAddress}%27&order_by=ORDER_BY_DESC`);
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

    const stakedTransaction = txResponses.filter((tx: any) => {
      const messages = tx?.tx?.body?.messages || [];
      return messages.some((msg: any) =>
        msg?.["@type"] === "/cosmos.staking.v1beta1.MsgDelegate" &&
        msg?.validator_address === body.validator &&
        Number(msg?.amount.amount) >= 500000
      );
    });

    if (!stakedTransaction?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'No stake data found for your account!',
        },
        { status: 400 }
      );
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
    console.log(error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

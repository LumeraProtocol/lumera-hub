/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/delegate-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import axios from 'axios';

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

    if (!body?.recaptchaToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing reCAPTCHA token',
          type: 'required'
        },
        { status: 400 }
      );
    }
    try {
      const secretKey = process.env.RECAPTCHA_SECRET_KEY;
      if (!secretKey) {
        return NextResponse.json(
          {
            success: false,
            message: "Server error: Missing reCAPTCHA secret key"
          },
          { status: 500 }
        );
      }

      const { data } = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          secret: secretKey,
          response: body.recaptchaToken,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
      if (!data.success) {
        return NextResponse.json({
          success: false,
          error: "reCAPTCHA verification failed",
          type: 'required'
        }, { status: 400 });
      }
    } catch (error) {
      console.error("reCAPTCHA verification error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Server error during reCAPTCHA verification"
        },
        { status: 500 }
      );
    }

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
      dayjs.utc(loyaltyRule.startTime).startOf('hour').valueOf() > dayjs.utc(txResponses.timestamp).startOf('hour').valueOf() ||
      (loyaltyRule.endTime && dayjs.utc(loyaltyRule.endTime).startOf('hour').valueOf() < dayjs.utc(txResponses.timestamp).startOf('hour').valueOf())
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid transaction time. Please use a different one.',
        },
        { status: 400 }
      );
    }
    if (
      message?.from_address !== config.claim.validator ||
      message['@type'].indexOf('staking.v1beta1.MsgDelegate') === -1 ||
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
  } catch (error: any) {
    console.error(error);
    if (error?.statusCode === 500 && error?.message?.indexOf('encoding/hex') !== -1) {
      return NextResponse.json({
        error: 'Data not found!',
      }, {
        status: 500,
      });
    }
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

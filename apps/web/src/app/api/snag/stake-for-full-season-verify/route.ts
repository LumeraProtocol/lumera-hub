/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/claim-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';
import axios from 'axios';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { RATE_VALUE } from '@/contants';
import client from '@/lib/snag';

dayjs.extend(utc);
dayjs.extend(weekday);

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
          error: 'Snag address is required!',
        },
        { status: 400 }
      );
    }

    if (!body?.address) {
      return NextResponse.json(
        {
          success: false,
          error: 'Your address is required!',
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
    const { data } = await instance.getExternal(config.urlCheck.replaceAll('{walletAddress}', body.address));
    const txResponses = data?.tx_responses;
    if (!txResponses?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found!',
        },
        { status: 400 }
      );
    }
    const now = dayjs().utc();
    const startQuest = dayjs.utc(loyaltyRule.startTime);
    const endQuest = dayjs.utc(loyaltyRule.endTime);

    if (Number(endQuest.format('YYYYMMDD')) !== Number(now.format('YYYYMMDD'))) {
      return NextResponse.json(
        {
          success: false,
          error: 'This quest can only be received on the last day of the season.',
        },
        { status: 400 }
      );
    }

    const monday = startQuest.subtract(startQuest.day() === 0 ? 6 : startQuest.day() - 1, 'day');
    const sunday = monday.add(6, 'day');
    const txs = txResponses.filter((tx: any) => {
      const txDateStr = dayjs.utc(tx.timestamp).format('YYYYMMDD');
      if (Number(txDateStr) < Number(monday.format('YYYYMMDD')) ||
          Number(txDateStr) > Number(sunday.format('YYYYMMDD'))) {
          return false;
      }

      const messages = tx?.tx?.body?.messages || [];

      return messages.some((msg: any) =>
          msg?.['@type'] === '/cosmos.staking.v1beta1.MsgDelegate'
      );
    });

    if (!txs.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Transaction not found!',
        },
        { status: 400 }
      );
    }

    let totalStaked = 0;
    for (const item of txs) {
      const messages = item.tx.body.messages;
      for (const message of messages) {
        if (message.amount.denom === 'ulume') {
          totalStaked += Number(message.amount.amount);
        }
      }
    }

    if (totalStaked / RATE_VALUE < Number(config.stakeForFullSeason.amount)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Total delegated amount is less than the required amount.',
        },
        { status: 400 }
      );
    }

    const newTxs = txResponses.filter((tx: any) => {
      const txDateStr = dayjs.utc(tx.timestamp).format('YYYYMMDD');
      const messages = tx?.tx?.body?.messages || [];

      return Number(txDateStr) > Number(sunday.format('YYYYMMDD')) && messages.some((msg: any) =>
        msg?.['@type'] === '/cosmos.staking.v1beta1.MsgUndelegate'
      );
    });

    if (newTxs.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Continuous delegation required. Unbonding events detected.',
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

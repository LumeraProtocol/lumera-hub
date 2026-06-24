/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/claim-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import axios from 'axios';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';
import { URL_CHECK } from '@/contants/snag';

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
    let urlCheck = URL_CHECK.mainnet.urlCheck.supernode;
    if (config.network === 'testnet') {
      urlCheck = URL_CHECK.testnet.urlCheck.supernode;
    }

    const { data } = await instance.getExternal(urlCheck);
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
    const limit = config.storageRequests.requests;
    const supernodeURL = config.urlCheck.replaceAll('{supernodeAddress}', body.address).replaceAll('{itemPerPage}', limit);
    const supernodeRes = await instance.getExternal(supernodeURL);
    if (supernodeRes?.data?.items?.length < Number(limit)) {
      return NextResponse.json(
        {
          success: false,
          error: 'The number of requests is less than the required quantity.',
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

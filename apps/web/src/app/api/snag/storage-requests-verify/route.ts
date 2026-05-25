/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/claim-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { fromHex, toBase64 } from '@cosmjs/encoding';
import utc from 'dayjs/plugin/utc';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';
import { IValidator } from '@/types/validator';
import {
  consensusPubkeyToHexAddress,
  valconsToBase64,
} from '@/utils/helpers';
import { URL_CHECK } from '@/contants/snag';

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
  } catch (error) {
    console.error(error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

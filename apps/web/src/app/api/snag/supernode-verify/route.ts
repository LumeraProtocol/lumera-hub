/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/claim-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { fromHex, toBase64 } from '@cosmjs/encoding';
import utc from 'dayjs/plugin/utc';
import axios from 'axios';

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
    const { data } = await instance.getExternal(config.urlCheck);
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

    const validatorAddress = nodes.find((node: any) => node.validator_address === body.address);
    if (!validatorAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'The validator address does not exist in the supernode list.',
        },
        { status: 400 }
      );
    }

    if (validatorAddress.supernode_account !== user.lumeraAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Account address does not match user.',
        },
        { status: 400 }
      );
    }

    const validators = await instance.getExternal(config.supernode.validatorUrl);
    if (!validators?.data?.validators?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validators not found!',
        },
        { status: 400 }
      );
    }

    const validator = validators?.data?.validators.find((v: any) => v.operator_address === validatorAddress.validator_address);
    if (!validator) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validator not found!',
        },
        { status: 400 }
      );
    }

    const getUptime = async (validator: IValidator | null) => {
      if (!validator) {
        return 0;
      }
      let slashingUrl = URL_CHECK.mainnet.urlCheck.slashingParams;
      let signingInfosUrl = URL_CHECK.mainnet.urlCheck.signingInfos;
      if (config.network === 'testnet') {
        slashingUrl = URL_CHECK.testnet.urlCheck.slashingParams;
        signingInfosUrl = URL_CHECK.testnet.urlCheck.signingInfos;
      }
      const [slashingParamsRes, signingInfosRes] = await Promise.all([
        instance.get(slashingUrl),
        instance.get(signingInfosUrl),
      ]);
      const slashingParams = slashingParamsRes.data.params;
      const signingInfos = signingInfosRes.data.info;
      const hex = consensusPubkeyToHexAddress(validator.consensus_pubkey);
      const window = Number(slashingParams.signed_blocks_window || 0);
      const signing = signingInfos.find((item: any) => {
        return toBase64(fromHex(hex)) === valconsToBase64(item.address)
      });
      return signing && window > 0
        ? (window - Number(signing.missed_blocks_counter)) / window
        : 0
    }

    const updateTime = validator.commission.update_time;
    const pastDate = dayjs.utc(updateTime);
    const now = dayjs().utc();
    const uptime = Number(config.supernode.days);
    const diff = now.diff(pastDate, 'day');

    switch (config.condition) {
      case '>':
        if (diff <= uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is than the minimum requirement',
            },
            { status: 400 }
          );
        }
        break;
      case '<=':
        if (diff > uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is greater than the minimum requirement',
            },
            { status: 400 }
          );
        }
        break;
      case '<':
        if (diff >= uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is greater the minimum requirement',
            },
            { status: 400 }
          );
        }
        break;
      case '=':
         if (diff !== uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) does not match the required',
            },
            { status: 400 }
          );
        }
        break;
      default:
        if (diff < uptime) {
          return NextResponse.json(
            {
              success: false,
              error: 'The day(s) is less than the minimum requirement',
            },
            { status: 400 }
          );
        }
        break;
    }

    const uptimePercent = await getUptime(validator);
    const configUptimePercent = Number(config.supernode.uptime);
    if (Number(uptimePercent) < configUptimePercent) {
      return NextResponse.json(
        {
          success: false,
          error: 'Uptime over current epoch ≥ 99%.',
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

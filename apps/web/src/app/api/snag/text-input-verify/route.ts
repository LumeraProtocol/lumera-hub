// app/api/snag/balance-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { SnagUserResponse } from '@/entities/SnagUserResponse';

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
          type: 'required'
        },
        { status: 400 }
      );
    }

    if (!body?.loyaltyRuleID) {
      return NextResponse.json(
        {
          success: false,
          error: 'Quest ID is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }

    if (!body?.content) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    const snagUserResponseRepo = dataSource.getRepository(SnagUserResponse);
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

    const userResponse = await snagUserResponseRepo.createQueryBuilder()
      .select('id, status')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress: user.lumeraAddress })
      .andWhere('loyaltyRuleId = :loyaltyRuleId', { loyaltyRuleId: body.loyaltyRuleID })
      .getRawOne();

    switch (userResponse?.status) {
      case 'approved':
        return NextResponse.json(
          {
            success: false,
            error: "You've already answered this quest.",
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
    const config = JSON.parse(loyaltyRule.config);
    const maximumRewardClaims = Number(config.textInput.maximumRewardClaims);
    if (maximumRewardClaims > 1) {
      await snagUserResponseRepo.save({
        loyaltyRuleId,
        userId: user.userId,
        lumeraAddress: user.lumeraAddress,
        content: body.content,
        snagAddress: body.snagAddress,
        status: 'pending',
      })
    } else {
      await snagUserResponseRepo.save({
        id: userResponse?.id || undefined,
        loyaltyRuleId,
        userId: user.userId,
        lumeraAddress: user.lumeraAddress,
        content: body.content,
        snagAddress: body.snagAddress,
        status: 'pending',
      })
    }

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

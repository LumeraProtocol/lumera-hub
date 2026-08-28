// app/api/admin/trackings/save-wallet-connect/route.ts

import { NextRequest, NextResponse, userAgent } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { hubUserSchema } from '@/schemas/hubUserSchema';
import { SnagRefer } from '@/entities/SnagRefer';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';
import { persistWalletConnection } from '@/lib/wallet-connection-tracking';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = hubUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();

    const now = dayjs();
    const nowIso = now.toISOString();
    const acquisitionSource = data.acquisitionSource || 'Direct';

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'unknown';

    const ua = userAgent(req);

    const otherInfo = JSON.stringify({
      ua,
      userAgent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      language: req.headers.get('accept-language'),
      secChUa: req.headers.get('sec-ch-ua'),
      secChUaMobile: req.headers.get('sec-ch-ua-mobile'),
      secChUaPlatform: req.headers.get('sec-ch-ua-platform'),
      secChUaPlatformVersion: req.headers.get('sec-ch-ua-platform-version'),
    });

    const { isNewHub } = await persistWalletConnection(dataSource, {
      address: data.address,
      acquisitionSource,
      browser: ua?.browser?.name || null,
      ip,
      otherInfo,
      timestamp: nowIso,
    });

    if (isNewHub && data.referralCode) {
      // save SnagRefer
      try {
        const snagReferRepo = dataSource.getRepository(SnagRefer);
        const snagUserRepo = dataSource.getRepository(SnagUser);
        const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

        const refer = await snagReferRepo
          .createQueryBuilder()
          .select('lumeraAddress')
          .addSelect('claim')
          .where('lumeraAddress = :lumeraAddress', { lumeraAddress: data.address })
          .getRawOne();

        const referAddress = data.referralCode;
        if (referAddress !== data.address) {
          if (!refer) {
            await snagReferRepo.save({
              lumeraAddress: data.address,
              referAddress,
            });
          }

          if (!refer?.claim || Number(refer?.claim) <= 0) {
            const totalClaimRefer = await snagReferRepo
              .createQueryBuilder()
              .select('lumeraAddress')
              .where('referAddress = :referAddress', { referAddress })
              .andWhere("claim = '1'")
              .getCount();

            if (totalClaimRefer < 10) {
              const user = await snagUserRepo.createQueryBuilder()
                .select('snagAddress, lumeraAddress, userId')
                .where('lumeraAddress = :lumeraAddress', { lumeraAddress: referAddress })
                .getRawOne();
              const loyaltyRule = await snagLoyaltyRepo
                .createQueryBuilder()
                .select('id')
                .addSelect('config')
                .addSelect('startTime')
                .addSelect('endTime')
                .where("config LIKE '%referralLink%'")
                .andWhere("name LIKE '%connects wallet%'")
                .andWhere("name LIKE '%Invite%'")
                .getRawOne();

              if (user && loyaltyRule) {
                try {
                  await client.post(`/api/loyalty/rules/${loyaltyRule.id}/complete`, {
                    body: {
                      userId: user.userId,
                    },
                  });
                  await snagReferRepo.save({
                    lumeraAddress: data.address,
                    claim: 1,
                  });
                } catch (error) {
                  console.error(new Date(), `Wallet connect(rules complete) error. referAddress: ${referAddress}, loyaltyRuleID: ${loyaltyRule?.id}, userId: ${user.userId}. Error details: `, JSON.stringify(error));
                }
              }
            }
          }
        }
      } catch (error) {
        // The core wallet connection record is already committed. Referral
        // enrichment is best-effort and must not turn successful tracking into
        // a retrying 500 response.
        console.error('Wallet referral tracking error:', error);
      }
    }

    return NextResponse.json(
      { success: true, message: 'Tracking user successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tracking user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: (error as Error).message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// app/api/admin/trackings/save-wallet-connect/route.ts

import { NextRequest, NextResponse, userAgent } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { hubUserSchema } from '@/schemas/hubUserSchema';
import { SnagRefer } from '@/entities/SnagRefer';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

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

    const [existingHub] = await dataSource.query(
      `
      SELECT address, total_connected, acquisition_source
      FROM hub_address
      WHERE address = ?
      LIMIT 1
      `,
      [data.address]
    );

    if (existingHub) {
      await dataSource.query(
        `
        UPDATE hub_address
        SET
          last_connected = ?,
          total_connected = ?,
          acquisition_source = COALESCE(?, acquisition_source)
        WHERE address = ?
        `,
        [
          nowIso,
          Number(existingHub.total_connected) + 1,
          existingHub.acquisition_source || acquisitionSource,
          data.address,
        ]
      );
    } else {
      await dataSource.query(
        `
        INSERT INTO hub_address (
          address,
          first_connected,
          last_connected,
          total_connected,
          acquisition_source
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [data.address, nowIso, nowIso, 1, acquisitionSource]
      );
    }

    const [existingAddr] = await dataSource.query(
      `
      SELECT address
      FROM address
      WHERE address = ?
      LIMIT 1
      `,
      [data.address]
    );

    if (!existingAddr) {
      await dataSource.query(
        `
        INSERT INTO address (address, timestamp, type, created_at, updated_at)
        VALUES (?, ?, 'hub', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [data.address, nowIso]
      );
    }

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

    await dataSource.query(
      `
      INSERT INTO hub_address_connected_log (
        address,
        ip,
        browser,
        other_info,
        created_at,
        acquisition_source
      ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        data.address,
        ip,
        ua?.browser?.name || null,
        otherInfo,
        nowIso,
        data.acquisitionSource || null,
      ]
    );

    // save SnagRefer
    const snagReferRepo = dataSource.getRepository(SnagRefer);
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    const refer = await snagReferRepo
      .createQueryBuilder()
      .select('lumeraAddress')
      .addSelect('claim')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress: data.address })
      .getRawOne();

    if (body.referralCode) {
      const referAddress = body.referralCode;
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
              .getRawOne();

            if (user && loyaltyRule) {
              await client.post(`/api/loyalty/rules/${loyaltyRule.id}/complete`, {
                body: {
                  userId: user.userId,
                },
              });
              await snagReferRepo.save({
                lumeraAddress: data.address,
                claim: 1,
              });
            }
          }
        }
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

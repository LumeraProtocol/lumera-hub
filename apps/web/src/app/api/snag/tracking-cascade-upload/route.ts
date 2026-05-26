/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/save-user/route.ts

import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { getDataSource } from '@/lib/data-source';
import { cascadeUploadSchema } from '@/schemas/cascadeUploadSchema';
import { SnagCascadeStorage } from '@/entities/SnagCascadeStorage';
import { SnagRefer } from '@/entities/SnagRefer';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

dayjs.extend(utc);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = cascadeUploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const snagCascadeStorageRepo = dataSource.getRepository(SnagCascadeStorage);
    const snagReferRepo = dataSource.getRepository(SnagRefer);
    const snagUserRepo = dataSource.getRepository(SnagUser);
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    const existsUser = await snagCascadeStorageRepo
      .createQueryBuilder()
      .select('lumeraAddress')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress: data.lumeraAddress })
      .getRawOne();

    if (!existsUser?.lumeraAddress) {
      const nowUTC = dayjs.utc();
      await snagCascadeStorageRepo.save({
        lumeraAddress: validation.data.lumeraAddress,
        taskId: validation.data.taskId,
        created_at: nowUTC,
      });
    }

    const refer = await snagReferRepo
      .createQueryBuilder()
      .select('lumeraAddress')
      .addSelect('claimCascade')
      .addSelect('referAddress')
      .where('lumeraAddress = :lumeraAddress', { lumeraAddress: data.lumeraAddress })
      .getRawOne();

    if (refer && (!refer?.claimCascade || Number(refer?.claimCascade) <= 0)) {
      const totalClaimCascade = await snagReferRepo
        .createQueryBuilder()
        .select('lumeraAddress')
        .where('referAddress = :referAddress', { referAddress: refer.referAddress })
        .andWhere("claimCascade = '1'")
        .getCount();

      if (totalClaimCascade < 10) {
        const user = await snagUserRepo.createQueryBuilder()
          .select('snagAddress, lumeraAddress, userId')
          .where('lumeraAddress = :lumeraAddress', { lumeraAddress: refer.referAddress })
          .getRawOne();
        const loyaltyRule = await snagLoyaltyRepo
          .createQueryBuilder()
          .select('id')
          .addSelect('config')
          .addSelect('startTime')
          .addSelect('endTime')
          .where("config LIKE '%inviteUsersUploadToCascade%'")
          .getRawOne();

        if (user && loyaltyRule) {
          await client.post(`/api/loyalty/rules/${loyaltyRule.id}/complete`, {
            body: {
              userId: user.userId,
            },
          });
          await snagReferRepo.save({
            lumeraAddress: data.lumeraAddress,
            claimCascade: 1,
          });
        }
      }
    }

    return NextResponse.json({
      status: true,
    });
  } catch (error) {
    console.error('error', error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

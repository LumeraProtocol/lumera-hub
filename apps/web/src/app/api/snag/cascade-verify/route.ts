/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/balance-verify/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';

import * as instance from '@/utils/api-server';
import { getDataSource } from '@/lib/data-source';
import { SnagUser } from '@/entities/SnagUser';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { SnagCascadeStorage } from '@/entities/SnagCascadeStorage';
import client from '@/lib/snag';
import { UPLOAD_CASCADE } from '@/contants/snag';

dayjs.extend(utc);
dayjs.extend(weekday);

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
    const snagCascadeStorageRepo = dataSource.getRepository(SnagCascadeStorage);

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
          error: 'Quest not found!',
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
    const type = config.uploadedToCascade.type;
    const files = Number(config.uploadedToCascade.files);
    const size = Number(config.uploadedToCascade.size);
    const types = Number(config.uploadedToCascade.types);
    const store = Number(config.uploadedToCascade.store);
    const startTime = dayjs.utc(loyaltyRule.startTime).format('YYYYMMDD');
    const endTime = dayjs.utc(loyaltyRule.endTime).format('YYYYMMDD');
    const targetTime = dayjs.utc().format('YYYYMMDD');
    if (type === UPLOAD_CASCADE[4].value && Number(endTime) < Number(targetTime)) {
      return NextResponse.json(
        {
          success: false,
          error: 'This quest can only be received on the last day of the season.',
        },
        { status: 400 }
      );
    }

    const { data } = await instance.getExternal(`${config.urlCheck}${user.lumeraAddress}`);
    const items = data?.items.filter((item: any) => Number(dayjs.utc(item.register_tx_time).format('YYYYMMDD')) >= Number(startTime) && Number(dayjs.utc(item.register_tx_time).format('YYYYMMDD')) <= Number(endTime));
    if (!items?.length) {
      return NextResponse.json(
        {
          success: false,
          error: 'Cascade not found!',
        },
        { status: 400 }
      );
    }

    switch (type) {
      // Upload 5+ files to Cascade
      case UPLOAD_CASCADE[0].value:
        const cascadeFiles = items.filter((item: any) => (Number(item.size) / 1024) >= Number(size));
        if (cascadeFiles.length < files) {
          return NextResponse.json(
            {
              success: false,
              error: `The number of files is less than the minimum(${files} file) required.`,
            },
            { status: 400 }
          );
        }
        break;
      // Upload 3 different file types
      case UPLOAD_CASCADE[1].value:
        const totalFileTypes: string[] = [];
        for (const item of items) {
          if (!totalFileTypes.includes(item.mime_type)) {
            totalFileTypes.push(item.mime_type);
          }
        }
        if (totalFileTypes.length < types) {
          return NextResponse.json(
            {
              success: false,
              error: `The number of file types less than the minimum(${files} file types) required.`,
            },
            { status: 400 }
          );
        }
        break;
      // Upload a file larger than 100 MB
      case UPLOAD_CASCADE[2].value:
        const file = items.find((item: any) => (Number(item.size) / 1048576) >= size);
        if (!file) {
          return NextResponse.json(
            {
              success: false,
              error: `No files were found with a size greater than or equal to the minimum(${size} MB) required.`,
            },
            { status: 400 }
          );
        }
        break;
      // Store 1 GB total on Cascade
      case UPLOAD_CASCADE[3].value:
      case UPLOAD_CASCADE[4].value:
        const totalStore = items.reduce((item: any, total: number) => Number(item.size) + total, 0);
        if (!totalStore || totalStore / 1073741824 < store) {
          return NextResponse.json(
            {
              success: false,
              error: `The total size of saved files has not reached the minimum(${store} GB) required.`,
            },
            { status: 400 }
          );
        }
        break;
      case UPLOAD_CASCADE[5].value:
        const limit = config.uploadedToCascade.ranking;
        const firstUpload = await snagCascadeStorageRepo.createQueryBuilder().select('lumeraAddress').orderBy('created_at').limit(limit).getRawMany();
        const cascade = firstUpload?.filter((c) => c.lumeraAddress === user.lumeraAddress);
        if (!cascade) {
          return NextResponse.json(
            {
              success: false,
              error: `You don't have any cascades uploaded in the top ${limit} as requested.`,
            },
            { status: 400 }
          );
        }
        break;
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

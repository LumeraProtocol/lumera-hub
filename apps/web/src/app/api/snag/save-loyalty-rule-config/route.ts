/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/save-loyalty-rule-config/route.ts

import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {

    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    const result = await snagLoyaltyRepo.save({
      id: body.id,
      config: body.config,
    });

    await client.loyalty.rules.update(body.id, {
      name: body.loyalty.name,
      amount: body.loyalty.amount.toString(),
      endTime: dayjs(body.loyalty.startTime).add(30, 'day').toISOString(),
      metadata: {
        cta: {
          href: body.href,
          label: "Claim",
        },
      },
    });

    return NextResponse.json({
      status: true,
      result,
    });
  } catch (error: any) {
    if (error.message.includes('invalid json') || error.message.includes('Unexpected end')) {
      const rules = await client.loyalty.rules.list({
        loyaltyRuleId: body.id,
      });
      const metadata: any = rules.data[0].metadata;
      if (metadata.cta.href === body.href) {
        return NextResponse.json({
          status: true,
          result: rules.data[0],
        });
      }
    }
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

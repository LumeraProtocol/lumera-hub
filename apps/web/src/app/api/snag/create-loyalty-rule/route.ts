/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/save-loyalty-rule-config/route.ts

import { NextResponse, NextRequest } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';
import { generateUrlCheck } from '@/utils/helpers';

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);

    const result = await client.loyalty.rules.create({
      ...body.loyaltyRule,
      organizationId: process.env.SNAG_ORGANIZATION_ID || '',
      websiteId: process.env.SNAG_WEBSITE_ID || '',
    });

    const config = JSON.parse(body.config);

    const metadata = {
      cta: {
        href: generateUrlCheck(config.domain, result.id, body.actionType),
        label: body.loyaltyRule.metadata.cta.label,
      },
      range: body.loyaltyRule.metadata.range
    };
    try {
      await client.loyalty.rules.update(result.id, {
        name: body.loyaltyRule.name,
        amount: body.loyaltyRule.amount.toString(),
        startTime: body.loyaltyRule.startTime,
        endTime: body.loyaltyRule.endTime,
        interval: body.loyaltyRule.interval,
        metadata,
      });
    } catch (error: any) {
      console.log(error)
    }

    const loyaltyRes = await client.loyalty.rules.list({
      loyaltyRuleId: result.id,
    })
    const loyalty = loyaltyRes.data[0];

    const entity: SnagLoyalty = {
      id: loyalty.id,
      name: loyalty.name,
      description: loyalty.description,
      endTime: loyalty.endTime || '',
      startTime: loyalty.startTime || '',
      rewardType: loyalty.rewardType,
      organizationId: loyalty.organizationId,
      websiteId: loyalty.websiteId,
      type: loyalty.type,
      frequency: loyalty.frequency,
      amount: loyalty.amount || 0,
      loyaltyRuleChain: JSON.stringify(loyalty.loyaltyRuleChain),
      createdAt: loyalty.createdAt,
      updatedAt: loyalty.updatedAt,
      deletedAt: loyalty.deletedAt || '',
      collectionAddress: loyalty.collectionAddress || '',
      mediaUrl: loyalty.mediaUrl || '',
      metadata: JSON.stringify({
        ...loyalty.metadata,
        cta: metadata.cta,
      }),
      dappDeployedWithin: loyalty.dappDeployedWithin || '',
      dappDataWindow: loyalty.dappDataWindow || '',
      sprintID: body.sprintID,
      config: body.config,
      loyaltyCurrencyId: body.loyaltyRule.loyaltyCurrencyId,
      loyaltyRuleGroupId: body.loyaltyRule.loyaltyRuleGroupId,
      claimType: body.loyaltyRule.claimType,
    }
    await snagLoyaltyRepo.save([entity]);
    return NextResponse.json({
      status: true,
      loyaltyRule: loyalty,
    });
  } catch (error: any) {
    console.log(error)
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

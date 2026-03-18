/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/save-loyalty-rule-config/route.ts

import { NextResponse, NextRequest } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import client from '@/lib/snag';

export async function POST(req: NextRequest) {
  const body = await req.json();
  let loyaltyRuleId = '';
  try {
    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    loyaltyRuleId = body.loyaltyRuleId;

    const config = JSON.parse(body.config);
    const generateUrlCheck = () => {
      const path = `${config.domain}snag/${loyaltyRuleId}`;
      let prefix = '';
      switch (body.actionType) {
        case 'staked':
          prefix = '/stake';
          break;
        case 'delegate':
          prefix = '/delegate';
          break;
        case 'redelegated':
          prefix = '/redelegate';
          break;
        case 'balance':
          prefix = '/balance';
          break;
        case 'claim':
          prefix = '/claim';
          break;
        case 'supernode':
          prefix = '/supernode';
          break;
        case 'send':
          prefix = '/send';
          break;
      }
      if (body.actionType === 'connect') {
        return config.domain;
      }
      return `${path}${prefix}`;
    }

    const metadata = {
      cta: {
        href: generateUrlCheck(),
        label: body.loyaltyRule.metadata.cta.label,
      },
      range: body.loyaltyRule.metadata.range
    };
    try {
      await client.loyalty.rules.update(loyaltyRuleId, {
        ...body.loyaltyRule,
        metadata,
      });
    } catch (error: any) {
      console.error('update error:', error)
      if (!error.message.includes('invalid json') && !error.message.includes('Unexpected end')) {
        return NextResponse.json({
          error: (error as Error).message,
        }, {
          status: 500,
        });
      }
    }

    const loyaltyRes = await client.loyalty.rules.list({
      loyaltyRuleId: loyaltyRuleId,
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
    loyaltyRuleId = loyalty.id;
    return NextResponse.json({
      status: true,
      loyaltyRule: loyalty,
    });
  } catch (error: any) {
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

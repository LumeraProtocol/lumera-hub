/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/trackings/sync-loyalty-rules/route.ts

import { NextResponse, NextRequest } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagLoyalty } from '@/entities/SnagLoyalty';
import { SnagCurrency } from '@/entities/SnagCurrency';
import client from '@/lib/snag';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const sprintID = searchParams.get("sprintID")?.trim() || "";
    const dataSource = await getDataSource();
    const snagLoyaltyRepo = dataSource.getRepository(SnagLoyalty);
    const snagCurrencyRepo = dataSource.getRepository(SnagCurrency);

    let isContinue = true;
    let startingAfter = '';
    do {
      const loyaltyRules: any = await client.get(`api/loyalty/rules?limit=10${startingAfter}`);

      const entities: SnagLoyalty[] = [];
      const loyaltyRulesData = loyaltyRules?.data;
      if (loyaltyRulesData?.length) {
        for (const item of loyaltyRulesData) {
          entities.push({
            id: item.id,
            name: item.name,
            description: item.description,
            endTime: item.endTime,
            startTime: item.startTime,
            rewardType: item.rewardType,
            organizationId: item.organizationId,
            websiteId: item.websiteId,
            type: item.type,
            frequency: item.frequency,
            amount: item.amount,
            loyaltyRuleChain: JSON.stringify(item.loyaltyRuleChain),
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            deletedAt: item.deletedAt,
            collectionAddress: item.collectionAddress,
            mediaUrl: item.mediaUrl,
            metadata: JSON.stringify(item.metadata),
            dappDeployedWithin: item.dappDeployedWithin,
            dappDataWindow: item.dappDataWindow,
            sprintID,
          });
        }
        startingAfter = `&startingAfter=${loyaltyRulesData[loyaltyRulesData.length - 1].id}`;
      }

      if (entities.length) {
        await snagLoyaltyRepo.save(entities);
      }
      if (!loyaltyRules?.hasNextPage) {
        isContinue = false;
      }
    } while (isContinue);

    if (process.env.SNAG_ORGANIZATION_ID && process.env.SNAG_WEBSITE_ID) {
      const currenciesRes: any = await client.loyalty.currencies.list({
        organizationId: process.env.SNAG_ORGANIZATION_ID,
        websiteId: process.env.SNAG_WEBSITE_ID,
      });
      const currenciesData = currenciesRes?.data;
      const entities = [];
      for (const currency of currenciesData) {
        entities.push({
          id: currency.id,
          name: currency.name,
        });
      }

      if (entities?.length) {
        await snagCurrencyRepo.save(entities);
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
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

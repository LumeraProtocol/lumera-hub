/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/trackings/sync-loyalty-currencies/route.ts

import { NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagCurrency } from '@/entities/SnagCurrency';
import client from '@/lib/snag';

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const snagCurrencyRepo = dataSource.getRepository(SnagCurrency);

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
    console.error('Sync Loyalty Currencies error:', error);
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

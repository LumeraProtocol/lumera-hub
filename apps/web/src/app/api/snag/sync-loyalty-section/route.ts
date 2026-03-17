/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/trackings/sync-loyalty-section/route.ts

import { NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';
import { SnagSection } from '@/entities/SnagSection';
import client from '@/lib/snag';

export async function GET() {
  try {
    const dataSource = await getDataSource();
    const snagSectionRepo = dataSource.getRepository(SnagSection);

    if (process.env.SNAG_ORGANIZATION_ID && process.env.SNAG_WEBSITE_ID) {
      const sectionsRes: any = await client.loyalty.ruleGroups.getRuleGroups();
      const sectionsData = sectionsRes?.data;
      const entities = [];
      for (const section of sectionsData) {
        entities.push({
          id: section.id,
          name: section.name,
        });
      }

      if (entities?.length) {
        await snagSectionRepo.save(entities);
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('Sync Loyalty Section error:', error);
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

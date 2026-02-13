// app/api/admin/tracking-summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { HubAddress } from '@/entities/HubAddress';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const hubAddressRepo = dataSource.getRepository(HubAddress);

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || dayjs().toISOString();
    const endDate = searchParams.get("endDate") || dayjs().toISOString();

    const totalNewAddress = await hubAddressRepo.createQueryBuilder()
      .select('1')
      .where('first_connected >= :startDate', { startDate })
      .andWhere('first_connected <= :endDate', { endDate })
      .getCount();

    const activatedWallets = await hubAddressRepo.createQueryBuilder('adr')
      .select('1')
      .where('first_connected <= :endDate', { endDate })
      .andWhere('first_connected >= :startDate', { startDate })
      .andWhere('EXISTS (SELECT 1 FROM transactions WHERE creator = adr.address AND timestamp <= :end AND timestamp >= :start)', { end: endDate, start: startDate })
      .getCount();


    const items = await hubAddressRepo.createQueryBuilder('adr')
      .select('COUNT(1)', 'total')
      .addSelect("strftime('%Y-%m-%d', first_action_timestamp)", 'date')
      .where('first_connected <= :endDate', { endDate })
      .andWhere('first_connected >= :startDate', { startDate })
      .andWhere('first_action_timestamp <= :endDate', { endDate })
      .groupBy("strftime('%Y-%m-%d', first_action_timestamp)")
      .orderBy('first_action_timestamp', 'ASC')
      .getRawMany();


    const acquisitionSources = await hubAddressRepo.createQueryBuilder()
      .select('acquisition_source', 'refer')
      .addSelect("COUNT(acquisition_source)", 'total')
      .where('first_connected >= :startDate', { startDate })
      .andWhere('first_connected <= :endDate', { endDate })
      .groupBy('acquisition_source')
      .orderBy('first_connected', 'ASC')
      .getRawMany();


    return NextResponse.json({
      success: true,
      items,
      totalNewAddress,
      activatedWallets,
      acquisitionSources,
    });
  } catch (error) {
    console.error('Error fetching wallets:', error);
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

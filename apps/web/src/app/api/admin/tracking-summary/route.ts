// app/api/admin/tracking-summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Tracking } from '@/entities/Tracking';
import { Address } from '@/entities/Address';
import { HubAddress } from '@/entities/HubAddress';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();
    const trackingRepo = dataSource.getRepository(Tracking);
    const hubAddressRepo = dataSource.getRepository(HubAddress);

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || dayjs().format('YYYY-MM-DD');
    const endDate = searchParams.get("endDate") || dayjs().format('YYYY-MM-DD');

    const item = await trackingRepo.createQueryBuilder()
      .select('SUM(delegate)', 'delegate')
      .addSelect('SUM(delegate_lume)', 'delegate_lume')
      .addSelect('SUM(redelegate)', 'redelegate')
      .addSelect('SUM(redelegate_lume)', 'redelegate_lume')
      .addSelect('SUM(unstaking)', 'unstaking')
      .addSelect('SUM(unstaking_lume)', 'unstaking_lume')
      .addSelect('SUM(cascade_upload)', 'cascade_upload')
      .addSelect('SUM(cascade_download)', 'cascade_download')
      .addSelect('SUM(cascade_image)', 'cascade_image')
      .addSelect('SUM(cascade_video)', 'cascade_video')
      .addSelect('SUM(cascade_program)', 'cascade_program')
      .addSelect('SUM(cascade_archive)', 'cascade_archive')
      .addSelect('SUM(cascade_document)', 'cascade_document')
      .addSelect('SUM(cascade_other)', 'cascade_other')
      .addSelect('SUM(cascade_total_price)', 'cascade_total_price')
      .addSelect('SUM(cascade_total_fee)', 'cascade_total_fee')
      .where('date >= :startDate', { startDate })
      .andWhere('date <= :endDate', { endDate })
      .getRawOne();

    const tracking = await trackingRepo.createQueryBuilder()
      .select('total_address')
      .addSelect('cascade_download_extra')
      .andWhere('date <= :endDate', { endDate })
      .orderBy('date', 'DESC')
      .getRawOne();

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        total_address: tracking?.total_address,
        cascade_download_extra: tracking?.cascade_download_extra,
      },
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

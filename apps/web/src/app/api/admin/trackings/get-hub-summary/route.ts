// app/api/admin/trackings/get-hub-summary/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || dayjs().format('YYYY-MM-DD');
    const endDate = searchParams.get('endDate') || dayjs().format('YYYY-MM-DD');

    const sumResult = await dataSource.query(
      `
      SELECT
        SUM(delegate)           AS "delegate",
        SUM(delegate_lume)      AS "delegate_lume",
        SUM(redelegate)         AS "redelegate",
        SUM(redelegate_lume)    AS "redelegate_lume",
        SUM(unstaking)          AS "unstaking",
        SUM(unstaking_lume)     AS "unstaking_lume",
        SUM(cascade_upload)     AS "cascade_upload",
        SUM(cascade_download)   AS "cascade_download",
        SUM(cascade_image)      AS "cascade_image",
        SUM(cascade_video)      AS "cascade_video",
        SUM(cascade_program)    AS "cascade_program",
        SUM(cascade_archive)    AS "cascade_archive",
        SUM(cascade_document)   AS "cascade_document",
        SUM(cascade_other)      AS "cascade_other",
        SUM(cascade_total_price) AS "cascade_total_price",
        SUM(cascade_total_fee)  AS "cascade_total_fee"
      FROM hub_tracking
      WHERE date >= ? AND date <= ?
      `,
      [startDate, endDate]
    );

    const item = sumResult[0] || {};

    const latestResult = await dataSource.query(
      `
      SELECT total_address, cascade_download_extra
      FROM hub_tracking
      WHERE date <= ?
      ORDER BY date DESC
      LIMIT 1
      `,
      [endDate]
    );

    const latest = latestResult[0] || {
      total_address: 0,
      cascade_download_extra: null,
    };

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        total_address: latest.total_address ?? 0,
        cascade_download_extra: latest.cascade_download_extra ?? null,
      },
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

// app/api/admin/trackings/get-wallet-connect/route.ts

import { NextRequest, NextResponse } from 'next/server';

import { getDataSource } from '@/lib/data-source';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();

    const searchParams = req.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
       {
         success: false,
         error: 'startDate or endDate is required.',
       },
       { status: 400 }
     );
    }

    const [newAddressRow] = await dataSource.query(
      `
      SELECT COUNT(*) AS count
      FROM hub_address
      WHERE first_connected >= ?
        AND first_connected <= ?
      `,
      [startDate, endDate]
    );
    const totalNewAddress = newAddressRow?.count || 0;

    const [activatedRow] = await dataSource.query(
      `
      SELECT COUNT(DISTINCT ha.address) AS count
      FROM hub_address ha
      WHERE ha.first_connected <= ?
        AND ha.first_connected >= ?
        AND EXISTS (
          SELECT 1
          FROM transactions t
          WHERE t.creator = ha.address
            AND t.timestamp >= ?
            AND t.timestamp <= ?
        )
      `,
      [endDate, startDate, startDate, endDate]
    );
    const activatedWallets = activatedRow?.count || 0;

    const items = await dataSource.query(
      `
      SELECT
        COUNT(*) AS total,
        strftime('%Y-%m-%d', first_action_timestamp) AS date
      FROM hub_address
      WHERE first_connected >= ?
        AND first_connected <= ?
        AND first_action_timestamp <= ?
      GROUP BY strftime('%Y-%m-%d', first_action_timestamp)
      ORDER BY first_action_timestamp ASC
      `,
      [startDate, endDate, endDate]
    );

    const acquisitionSources = await dataSource.query(
      `
      SELECT
        acquisition_source AS refer,
        COUNT(*) AS total
      FROM hub_address
      WHERE first_connected >= ?
        AND first_connected <= ?
      GROUP BY acquisition_source
      ORDER BY first_connected ASC
      `,
      [startDate, endDate]
    );

    return NextResponse.json({
      success: true,
      items,
      totalNewAddress,
      activatedWallets,
      acquisitionSources,
    });
  } catch (error) {
    console.error('Error fetching wallet connect stats:', error);
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

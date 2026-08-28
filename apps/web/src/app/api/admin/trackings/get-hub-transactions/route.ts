/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/admin/trackings/get-hub-transactions/route.ts

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

    const items = await dataSource.query(
      `
      SELECT *
      FROM hub_tracking
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
      `,
      [startDate, endDate]
    );

    const cascadeTransactions = await dataSource.query(
      `
      SELECT message_type, COUNT(message_type) as total, strftime('%Y-%m-%d', timestamp) AS date
      FROM transactions
      WHERE timestamp >= ? AND timestamp <= ?
      AND message_type LIKE '%MsgRequestAction%'
      AND action_type  = 'cascade'
      AND creator IS NOT NULL
      GROUP BY strftime('%Y-%m-%d', timestamp)
      ORDER BY timestamp ASC
      `,
      [startDate, endDate]
    );
    const newItems = items;
    for (let i = 0; i < items.length; i++) {
      const item = cascadeTransactions.find((tx: any) => tx.date === tx.date);
      if (item) {
        const currentItem = items[i];
        const parseData = currentItem.transaction_extra? JSON.parse(currentItem.transaction_extra) : [];
        parseData.push({
          message_type: item.message_type,
          total: item.total,
        });
        newItems[i] = {
          ...items[i],
          transaction_extra: JSON.stringify(parseData),
          total_transaction: items[i].total_transaction + item.total,
        }
      }
    }
    return NextResponse.json({
      success: true,
      items: newItems,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
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

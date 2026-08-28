// app/api/admin/trackings/save-wallet-connect/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { hubTransactionSchema } from '@/schemas/hubTransactionSchema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = hubTransactionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const now = dayjs();
    const nowIso = now.toISOString();

    const [existingHub] = await dataSource.query(
      `
      SELECT hash
      FROM hub_transaction
      WHERE hash = ?
      LIMIT 1
      `,
      [data.hash]
    );

    if (existingHub) {
      await dataSource.query(
        `
        UPDATE hub_transaction
        SET
          message_type = ?,
          creator = ?,
          price = ?
        WHERE hash = ?
        `,
        [
          data.message_type,
          data.creator,
          data.price,
          data.hash,
        ]
      );
    } else {
      await dataSource.query(
        `
        INSERT INTO hub_transaction (
          hash,
          timestamp,
          message_type,
          creator,
          price
        ) VALUES (?, ?, ?, ?, ?)
        `,
        [data.hash, nowIso, data.message_type, data.creator, data.price]
      );
    }

    return NextResponse.json(
      { success: true, message: 'Hub transaction save successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Hub transaction error:', error);
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

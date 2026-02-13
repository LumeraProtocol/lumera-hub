// app/api/admin/wallets/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';

export async function GET(req: NextRequest) {
  try {
    const dataSource = await getDataSource();

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 20), 100);
    const search = searchParams.get("search")?.trim() || "";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    const targetSql = `AND lastAction.timestamp >= '${dayjs(startDate).toISOString()}' AND lastAction.timestamp <= '${dayjs(endDate).toISOString()}'`;

    let sql = `
      SELECT
        address.address AS address,
        address.timestamp AS first_connected,
        lastAction.message_type AS last_action_type,
        lastAction.timestamp AS last_action_timestamp,
        lastAction.tx_hash AS last_tx_hash,
        (SELECT COUNT(1) FROM transactions WHERE message_type LIKE '%MsgRequestAction%' AND action_type  = 'cascade' AND creator = address.address AND timestamp >= '${dayjs(startDate).toISOString()}' AND timestamp <= '${dayjs(endDate).toISOString()}') AS cascade_upload
      FROM address
      LEFT JOIN (
        SELECT
          creator,
          message_type,
          timestamp,
          tx_hash,
          ROW_NUMBER() OVER (PARTITION BY creator ORDER BY timestamp DESC) AS rn
        FROM transactions
      ) AS lastAction
        ON lastAction.creator = address.address
        AND lastAction.rn = 1 WHERE 1 = 1 ${targetSql}
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (search) {
      sql += ` WHERE address.address LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += `
      ORDER BY lastAction.timestamp DESC NULLS LAST, address.updated_at DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, skip);

    const wallets = await dataSource.query(sql, params);

    let countSql = `SELECT COUNT(*) AS count FROM address
      LEFT JOIN (
        SELECT
          creator,
          timestamp,
          ROW_NUMBER() OVER (PARTITION BY creator ORDER BY timestamp DESC) AS rn
        FROM transactions
      ) AS lastAction
      ON lastAction.creator = address.address AND lastAction.rn = 1
      WHERE 1 = 1 ${targetSql}
    `;
    const countParams: string[] = [];

    if (search) {
      countSql += ` AND address LIKE ?`;
      countParams.push(`%${search}%`);
    }
    const [{ count }] = await dataSource.query(countSql, countParams);

    return NextResponse.json({
      success: true,
      items: wallets,
      pagination: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
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

// app/api/admin/wallets/route.ts

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

import { getDataSource } from '@/lib/data-source';

export async function GET(req: NextRequest) {
  // API protected
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });
  }

  try {
    const dataSource = await getDataSource();

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 20), 100);
    const search = searchParams.get("search")?.trim() || "";

    const skip = (page - 1) * limit;

    let sql = `
      SELECT
        wallet.id AS id,
        wallet.address AS address,
        wallet.first_connected AS first_connected,
        lastAction.action_type AS last_action_type,
        lastAction.timestamp AS last_action_timestamp,
        lastAction.tx_hash AS last_tx_hash
      FROM wallet
      LEFT JOIN (
        SELECT
          wallet_address,
          action_type,
          timestamp,
          tx_hash,
          ROW_NUMBER() OVER (PARTITION BY wallet_address ORDER BY timestamp DESC) AS rn
        FROM action
      ) AS lastAction
        ON lastAction.wallet_address = wallet.address
        AND lastAction.rn = 1
    `;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [];

    if (search) {
      sql += ` WHERE wallet.address LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += `
      ORDER BY lastAction.timestamp DESC NULLS LAST, wallet.first_connected DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, skip);

    const wallets = await dataSource.query(sql, params);

    let countSql = `SELECT COUNT(*) AS count FROM wallet`;
    const countParams: string[] = [];

    if (search) {
      countSql += ` WHERE address LIKE ?`;
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

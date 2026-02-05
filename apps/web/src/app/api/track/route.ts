// app/api/track/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/data-source';
import { Action } from '@/entities/Action';
import { Wallet } from '@/entities/Wallet';
import { trackActionSchema } from '@/schemas/trackActionSchema'; // import schema
import { checkRateLimit, getClientIP, RATE_LIMIT_WINDOW_MS } from '@/lib/rate-limit';

const MAX_REQUESTS = Number(process.env.NEXT_PUBLIC_MAX_TRACKING_REQUESTS || 30); // ~ 30/minute

export async function POST(req: NextRequest) {
  const ip = getClientIP(req);

  if (!checkRateLimit(ip, MAX_REQUESTS, RATE_LIMIT_WINDOW_MS)) {
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${Math.ceil(RATE_LIMIT_WINDOW_MS / 1000 / 60)} minutes.` },
      {
        status: 429,
      }
    );
  }

  try {
    const bodyRaw = await req.json();
    const validation = trackActionSchema.safeParse(bodyRaw);

    if (!validation.success) {
      const errors = validation.error.flatten().fieldErrors;
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data; // type: TrackActionInput

    const dataSource = await getDataSource();
    const walletRepo = dataSource.getRepository(Wallet);
    const actionRepo = dataSource.getRepository(Action);

    // 3. Upsert Wallet
    let wallet = await walletRepo.findOneBy({ address: data.wallet_address });
    if (!wallet) {
      wallet = walletRepo.create({
        address: data.wallet_address,
        first_connected: data.timestamp,
      });
      await walletRepo.save(wallet);
    }

    if (data.tx_hash) {
      const existing = await actionRepo.findOne({
        where: { wallet_address: data.wallet_address, tx_hash: data.tx_hash },
      });
      if (existing) {
        return NextResponse.json({ success: true, message: 'Action already tracked' });
      }
    }

    // 5. Insert Action
    const action = actionRepo.create({
      wallet_address: data.wallet_address,
      action_type: data.action_type,
      timestamp: data.timestamp,
      tx_hash: data.tx_hash || '',
      task_id: data.task_id || '',
    });
    await actionRepo.save(action);

    return NextResponse.json({
      success: true,
      action_id: action.id,
      message: 'Action tracked successfully',
    });
  } catch (error) {
    console.error('Track action error:', error);
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

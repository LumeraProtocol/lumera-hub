// app/api/admin/racking-hub-user-connect/route.ts
import { NextRequest, NextResponse, userAgent } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { Address } from '@/entities/Address';
import { HubAddress } from '@/entities/HubAddress';
import { HubAddressConnectedLog } from '@/entities/HubAddressConnectedLog';
import { hubUserSchema } from '@/schemas/hubUserSchema';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = hubUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const data = validation.data;
    const dataSource = await getDataSource();
    const hubAddressRepo = dataSource.getRepository(HubAddress);
    const addressRepo = dataSource.getRepository(Address);
    const logRepo = dataSource.getRepository(HubAddressConnectedLog);

    const user = await hubAddressRepo.createQueryBuilder().select('address').addSelect('total_connected').where('address = :address', { address: data.address }).getRawOne();
    if (user?.address) {
      await hubAddressRepo.save({
        address: data.address,
        last_connected: dayjs().toISOString(),
        total_connected: Number(user.total_connected) + 1,
      });
    } else {
      await hubAddressRepo.save({
        address: data.address,
        first_connected: dayjs().toISOString(),
        last_connected: dayjs().toISOString(),
        total_connected: 1,
      });
    }
    const txAddress = await addressRepo.createQueryBuilder().select('address').addSelect('total_connected').where('address = :address', { address: data.address }).getRawOne();
    if (!txAddress?.address) {
      await addressRepo.save({
        address: data.address,
        timestamp: dayjs().toISOString(),
        type: 'hub',
      });
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('cf-connecting-ip') ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const ua = userAgent(req);

    await logRepo.save({
      address: data.address,
      ip,
      browser: ua?.browser?.name,
      other_info: JSON.stringify({
        ua,
        userAgent: req.headers.get('user-agent'),
        referer: req.headers.get('referer'),
        language: req.headers.get('accept-language'),
        secChUa: req.headers.get('sec-ch-ua'),
        secChUaMobile: req.headers.get('sec-ch-ua-mobile'),
        secChUaPlatform: req.headers.get('sec-ch-ua-platform'),
        secChUaPlatformVersion: req.headers.get('sec-ch-ua-platform-version'),
      }),
      created_at: dayjs().toISOString(),
    });

    return NextResponse.json(
      { success: true, message: 'Tracking user successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tracking user error:', error);
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

// app/api/snag/users/route.ts
import { NextResponse, NextRequest } from 'next/server';

import client from '@/lib/snag';
import { getDataSource } from '@/lib/data-source';
import { snagUserSchema } from '@/schemas/snagUserSchema';
import { SnagUser } from '@/entities/SnagUser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = snagUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const snagUserRepo = dataSource.getRepository(SnagUser);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user: any = await client.get(`api/users?address=${data.snagAddress}`);
    const userId = user?.data[0]?.id || '';
    const result = await snagUserRepo.save({
      lumeraAddress: data.lumeraAddress,
      snagAddress: data.snagAddress,
      userId: user?.data[0]?.id || ''
    });
    const loyaltyRuleId = process.env.LOYALTY_RULE_ID || '';
    if (result && userId && loyaltyRuleId) {
      await client.post(`/api/loyalty/rules/${loyaltyRuleId}/complete`, {
        body: {
          userId,
        },
      });
    }

    return NextResponse.json({
      status: true,
      result,
    });
  } catch (error) {
    console.log('error', error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

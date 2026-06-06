// app/api/admin/wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getDataSource } from '@/lib/data-source';
import { AdminUser } from '@/entities/AdminUser';
import { USER_TYPE } from '@/contants';
import { isValidEmail } from '@/utils/helpers';

export async function POST(req: NextRequest) {
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
  const body = await req.json();
  if (!body.fullName) {
    return NextResponse.json(
      {
        success: false,
        error: 'Full Name is required!',
        type: 'required'
      },
      { status: 400 }
    );
  }
  if (!body.rule) {
    return NextResponse.json(
      {
        success: false,
        error: 'Rule is required!',
        type: 'required'
      },
      { status: 400 }
    );
  }
  if (!body.status) {
    return NextResponse.json(
      {
        success: false,
        error: 'Status is required!',
        type: 'required'
      },
      { status: 400 }
    );
  }
  if (body.type === USER_TYPE[0].value) {
    if (!body.email) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }
    if (!isValidEmail(body.email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Email is invalid!',
          type: 'required'
        },
        { status: 400 }
      );
    }
    if (!body.password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Password is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }
  } else {
    if (!body.walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Wallet Address is required!',
          type: 'required'
        },
        { status: 400 }
      );
    }
  }

  try {
    const dataSource = await getDataSource();
    const userRepo = dataSource.getRepository(AdminUser);

    // Check if email already exists

    if (body.type === USER_TYPE[0].value) {
      const existing = await userRepo.findOneBy({ email: body.email });
      if (existing) {
        return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
      }
    } else {
      const existing = await userRepo.findOneBy({ walletAddress: body.walletAddress });
      if (existing) {
        return NextResponse.json({ success: false, error: 'Wallet Address already exists' }, { status: 400 });
      }
    }

    const hashedPassword = await bcrypt.hash(body.password || body.walletAddress, 12);
    await userRepo.save({
      email: body.type === USER_TYPE[0].value ? body.email : `${body.walletAddress}@lumera.io`,
      passwordHash: hashedPassword,
      fullName: body.fullName,
      isActive: body.status === '1' ? true : false,
      rule: body.rule,
      walletAddress: body.walletAddress,
    });

    return NextResponse.json({
      success: true,
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

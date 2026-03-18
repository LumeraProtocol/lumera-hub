// app/api/admin/login/route.ts

import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getDataSource } from '@/lib/data-source';
import { AdminUser } from '@/entities/AdminUser';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.address) {
      return NextResponse.json(
        { success: false, error: 'Address is required.' },
        { status: 400 }
      );
    }

    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(AdminUser);

    const user = await repo
      .createQueryBuilder('admin')
      .select('*')
      .where('admin.walletAddress = :walletAddress', { walletAddress: body.address })
      .getRawOne();

    const safeUser = user;
    if (!user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied.',
        },
        { status: 401 }
      );
    } else {
      await repo.save({
        id: user.id,
        walletAddress: body.address,
      });
    }
    const secret = process.env.JWT_SECRET as string;
    const token = jwt.sign(
      {
        id: safeUser?.id || '',
        walletAddress: body.address,
      },
      secret,
      { expiresIn: (process.env.JWT_EXPIRY as jwt.SignOptions['expiresIn']) || '1d' }
    );

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        ...safeUser,
        passwordHash: undefined,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
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

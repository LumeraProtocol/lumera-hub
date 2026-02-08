// app/api/admin/login/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDataSource } from '@/lib/data-source';
import { AdminUser } from '@/entities/AdminUser';
import { loginAdminUserSchema } from '@/schemas/adminUserSchema';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = loginAdminUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;

    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(AdminUser);

    const user = await repo
      .createQueryBuilder('admin')
      .addSelect('admin.passwordHash')
      .where('admin.email = :email', { email })
      .getOne();

    if (!user || !user.isActive) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
    }

    const { passwordHash, ...safeUser } = user;

    // Generate JWT
    const secret = process.env.JWT_SECRET as string;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        // role: 'admin',
      },
      secret,
      { expiresIn: (process.env.JWT_EXPIRY as jwt.SignOptions['expiresIn']) || '1d' }
    );

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      user: safeUser,
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

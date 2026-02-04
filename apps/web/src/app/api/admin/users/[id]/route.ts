// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getDataSource } from '@/lib/data-source';
import { AdminUser } from '@/entities/AdminUser';
import { updateAdminUserSchema } from '@/schemas/adminUserSchema';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const body = await req.json();
    const validation = updateAdminUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(AdminUser);

    const user = await repo.findOneBy({ id });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    // Update fields if provided
    if (data.email && data.email !== user.email) {
      const emailExist = await repo.findOneBy({ email: data.email });
      if (emailExist) {
        return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
      }
      user.email = data.email;
    }

    if (data.password) {
      user.passwordHash = await bcrypt.hash(data.password, 12);
    }

    if (data.fullName !== undefined) user.fullName = data.fullName;
    if (data.isActive !== undefined) user.isActive = data.isActive;

    await repo.save(user);

    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: safeUser,
    });
  } catch (error) {
    console.error('Update admin user error:', error);
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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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
    const id = Number(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid ID' }, { status: 400 });
    }

    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(AdminUser);

    const user = await repo.findOneBy({ id });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    await repo.remove(user);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete admin user error:', error);
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

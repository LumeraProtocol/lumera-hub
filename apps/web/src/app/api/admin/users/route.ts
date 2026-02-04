// app/api/admin/wallets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import { getDataSource } from '@/lib/data-source';
import { AdminUser } from '@/entities/AdminUser';
import { createAdminUserSchema } from '@/schemas/adminUserSchema';


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
    const userRepo = dataSource.getRepository(AdminUser);

    const searchParams = req.nextUrl.searchParams;
    const page = Number(searchParams.get("page")) || 1;
    const limit = Math.min(Math.max(1, Number(searchParams.get("limit")) || 20), 100);
    const search = searchParams.get("search")?.trim() || "";

    const skip = (page - 1) * limit;

    // Query builder
    const queryBuilder = userRepo.createQueryBuilder("user");

    if (search) {
      queryBuilder
        .where("user.email LIKE :search", { search: `%${search}%` })
        .orWhere("user.fullName LIKE :search", { search: `%${search}%` });
    }

    queryBuilder.orderBy("user.createdAt", "DESC");

    const [wallets, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return NextResponse.json({
      success: true,
      items: wallets,
      pagination: {
        page,
        limit,
        total: Number(total),
        totalPages: Math.ceil(total / limit),
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

  try {
    const body = await req.json();
    const validation = createAdminUserSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const repo = dataSource.getRepository(AdminUser);

    // Check if email already exists
    const existing = await repo.findOneBy({ email: data.email });
    if (existing) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = repo.create({
      email: data.email,
      passwordHash,
      fullName: data.fullName,
      isActive: data.isActive,
    });

    await repo.save(user);

    // Remove sensitive field
    const { passwordHash: _, ...safeUser } = user;

    return NextResponse.json(
      { success: true, message: 'User created successfully', user: safeUser },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create admin user error:', error);
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

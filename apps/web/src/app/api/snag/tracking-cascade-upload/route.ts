/* eslint-disable @typescript-eslint/no-explicit-any */
// app/api/snag/save-user/route.ts

import { NextResponse, NextRequest } from 'next/server';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';

import { getDataSource } from '@/lib/data-source';
import { cascadeUploadSchema } from '@/schemas/cascadeUploadSchema';
import { SnagCascadeStorage } from '@/entities/SnagCascadeStorage';

dayjs.extend(utc);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = cascadeUploadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const snagCascadeStorageRepo = dataSource.getRepository(SnagCascadeStorage);

    const existsUser = await snagCascadeStorageRepo
    .createQueryBuilder()
    .select('lumeraAddress')
    .where('lumeraAddress = :lumeraAddress', { lumeraAddress: data.lumeraAddress })
    .getRawOne();

    if (existsUser?.lumeraAddress) {
      return NextResponse.json({
        status: true,
        result: null,
      });
    }
    const nowUTC = dayjs.utc();
    const result = await snagCascadeStorageRepo.save({
      lumeraAddress: validation.data.lumeraAddress,
      taskId: validation.data.taskId,
      created_at: nowUTC,
    });

    return NextResponse.json({
      status: true,
      result,
    });
  } catch (error) {
    console.error('error', error);
    return NextResponse.json({
      error: (error as Error).message,
    }, {
      status: 500,
    });
  }
}

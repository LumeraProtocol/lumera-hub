// app/api/admin/tracking/save-cascade-download/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
import { CascadeDownload } from '@/entities/CascadeDownload';
import { Tracking } from '@/entities/Tracking';
import { cascadeDownloadSchema } from '@/schemas/cascadeDownloadSchema';
import {
  IMAGE_EXT,
  DOCUMENT_EXT,
  VIDEO_EXT,
  ARCHIVE_EXT,
  PROGRAM_EXT,
} from '@/contants';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validation = cascadeDownloadSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: 'Validation failed', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const dataSource = await getDataSource();
    const cascadeDownloadRepo = dataSource.getRepository(CascadeDownload);
    const trackingRepo = dataSource.getRepository(Tracking);

    await cascadeDownloadRepo.save({
      date: dayjs().toISOString(),
      address: data.address,
      action_id: data.action_id,
      file_type: data.file_type,
    });
    const currentDate = dayjs().format('YYYY-MM-DD');
    const items = await cascadeDownloadRepo.createQueryBuilder()
      .select('file_type')
      .where('date LIKE :currentDate', { currentDate: `%${currentDate}%` })
      .getRawMany();
    const sizes = {
        image: 0,
        program: 0,
        document: 0,
        video: 0,
        archive: 0,
        other: 0,
    };
    items.forEach(item => {
      if (IMAGE_EXT.includes(item.file_type)) {
        sizes.image++;
      } else if (DOCUMENT_EXT.includes(item.file_type)) {
        sizes.document++;
      } else if (VIDEO_EXT.includes(item.file_type)) {
        sizes.video++;
      } else if (ARCHIVE_EXT.includes(item.file_type)) {
        sizes.archive++;
      } else if (PROGRAM_EXT.includes(item.file_type)) {
        sizes.program++;
      } else {
        sizes.other++;
      }
    });

    await trackingRepo.save({
      cascade_download: items.length,
      date: currentDate,
      cascade_download_extra: JSON.stringify(sizes),
    });
    return NextResponse.json(
      { success: true, message: 'Tracking cascade download successfully' },
      { status: 201 }
    );
  } catch (error) {
    console.error('Tracking cascade download error:', error);
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

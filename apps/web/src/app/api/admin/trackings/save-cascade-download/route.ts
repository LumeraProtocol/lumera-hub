// app/api/admin/tracking/save-cascade-download/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';

import { getDataSource } from '@/lib/data-source';
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

    const currentDate = dayjs().format('YYYY-MM-DD');
    const currentIso = dayjs().toISOString();

    await dataSource.query(
      `
      INSERT INTO cascade_download (date, address, action_id, file_type)
      VALUES (?, ?, ?, ?)
      `,
      [currentIso, data.address, data.action_id, data.file_type]
    );

    const items = await dataSource.query(
      `
      SELECT file_type
      FROM cascade_download
      WHERE date LIKE ?
      `,
      [`%${currentDate}%`]
    );

    const sizes = {
      image: 0,
      program: 0,
      document: 0,
      video: 0,
      archive: 0,
      other: 0,
    };

    items.forEach((item: { file_type: string }) => {
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

    const [existing] = await dataSource.query(
      `
      SELECT 1
      FROM tracking
      WHERE date = ?
      LIMIT 1
      `,
      [currentDate]
    );

    if (existing) {
      await dataSource.query(
        `
        UPDATE tracking
        SET
          cascade_download = ?,
          cascade_download_extra = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE date = ?
        `,
        [items.length, JSON.stringify(sizes), currentDate]
      );
    } else {
      await dataSource.query(
        `
        INSERT INTO tracking (
          date,
          cascade_download,
          cascade_download_extra,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [currentDate, items.length, JSON.stringify(sizes)]
      );
    }

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

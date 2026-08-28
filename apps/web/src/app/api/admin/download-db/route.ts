// app/api/admin/download-db/route.ts

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import dayjs from 'dayjs';

import { getDataSource } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dataSource = await getDataSource();
    if (!dataSource.isInitialized) {
      throw new Error("Database not initialized");
    }

    const backupFileName = `backup-${dayjs().format('YYYYMMDD')}.sqlite`;

    // public/backups directory
    const backupsDir = path.join(process.cwd(), "public", "backups");
    await fs.mkdir(backupsDir, { recursive: true });

    const backupPath = path.join(backupsDir, backupFileName);

    try {
      await fs.unlink(backupPath);
    } catch {
      // noop
    }

    // Use VACUUM INTO for a consistent snapshot
    const escapedPath = backupPath.replace(/'/g, "''");
    await dataSource.query(`VACUUM INTO '${escapedPath}'`);

    // Verify the backup file exists and has size
    const stats = await fs.stat(backupPath);
    if (stats.size === 0) {
      throw new Error("Backup file is empty");
    }

    const publicUrl = `/backups/${backupFileName}`;

    return NextResponse.json({
      success: true,
      downloadUrl: publicUrl,
      fileName: backupFileName,
      sizeBytes: stats.size,
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
    });
  } catch (error) {
    console.error("Download DB error:", error);
    return NextResponse.json(
      {
        error: "Download DB error",
        detail: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

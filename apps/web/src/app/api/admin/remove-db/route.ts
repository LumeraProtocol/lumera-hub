// app/api/admin/download-db/route.ts

import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

export async function GET() {
  try {
    const backupsDir = path.join(process.cwd(), "public", "backups");
    const files = await fs.readdir(backupsDir);
    let cleanedCount = 0;

    for (const file of files) {
      if (!file.endsWith(".sqlite")) continue;

      const filePath = path.join(backupsDir, file);
      await fs.unlink(filePath);
      console.log(`Deleted old file: ${file}`);
      cleanedCount++;
    }

    return NextResponse.json({
      success: true,
      cleaned: cleanedCount,
      message: `Cleaned ${cleanedCount} old backup file(s)`,
    });
  } catch (error) {
    console.error("Cleaned DB error:", error);
    return NextResponse.json(
      {
        error: "Cleaned DB error",
        detail: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

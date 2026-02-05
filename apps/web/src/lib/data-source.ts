// lib/data-source.ts
import "reflect-metadata";
import { DataSource } from "typeorm";

import * as entities from "@/entities";
import * as migrations from "@/migrations";

const isProduction = process.env.NODE_ENV === "production";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./database.sqlite",
  synchronize: false,
  logging: !isProduction ? ["query", "error"] : false,
  entities: Object.values(entities),
  migrations: Object.values(migrations),
  migrationsTableName: "migrations",
  migrationsRun: isProduction,
});

let initPromise: Promise<DataSource> | null = null;

export async function getDataSource(): Promise<DataSource> {
  if (AppDataSource.isInitialized) {
    return AppDataSource;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      await AppDataSource.initialize();
      console.log("✅ Database initialized on server startup (or first import)");

      await AppDataSource.query("PRAGMA journal_mode = WAL;");
      await AppDataSource.query("PRAGMA synchronous = NORMAL;");
      await AppDataSource.query("PRAGMA busy_timeout = 5000;");

      return AppDataSource;
    } catch (err) {
      console.error("❌ DB init failed:", err);
      throw err;
    }
  })();

  return initPromise;
}

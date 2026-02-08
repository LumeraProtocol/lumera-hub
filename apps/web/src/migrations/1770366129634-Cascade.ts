import { MigrationInterface, QueryRunner } from "typeorm";

export class Cascade1770366129634 implements MigrationInterface {
    name = 'Cascade1770366129634'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cascade" ("date" varchar(20) PRIMARY KEY NOT NULL, "upload" bigint DEFAULT (0), "download" bigint DEFAULT (0), "image" bigint DEFAULT (0), "video" bigint DEFAULT (0), "program" bigint DEFAULT (0), "archive" bigint DEFAULT (0), "document" bigint DEFAULT (0), "other" bigint DEFAULT (0), "total_price" bigint DEFAULT (0), "total_fee" bigint DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_86210a4ff23027b3c18006702a" ON "cascade" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_86210a4ff23027b3c18006702a"`);
        await queryRunner.query(`DROP TABLE "cascade"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class HubTracking1771144176689 implements MigrationInterface {
    name = 'HubTracking1771144176689'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hub_tracking" ("date" varchar(20) PRIMARY KEY NOT NULL, "delegate" bigint DEFAULT (0), "delegate_lume" double DEFAULT (0), "redelegate" bigint DEFAULT (0), "redelegate_lume" double DEFAULT (0), "unstaking" bigint DEFAULT (0), "unstaking_lume" double DEFAULT (0), "claim" bigint DEFAULT (0), "claim_lume" double DEFAULT (0), "cascade_download" bigint DEFAULT (0), "cascade_upload" bigint DEFAULT (0), "cascade_image" bigint DEFAULT (0), "cascade_video" bigint DEFAULT (0), "cascade_program" bigint DEFAULT (0), "cascade_archive" bigint DEFAULT (0), "cascade_document" bigint DEFAULT (0), "cascade_other" bigint DEFAULT (0), "cascade_total_price" bigint DEFAULT (0), "cascade_total_fee" bigint DEFAULT (0), "total_address" integer DEFAULT (0), "new_address" integer DEFAULT (0), "total_transaction" bigint DEFAULT (0), "transaction_extra" text, "cascade_download_extra" text, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_f6e404de4dfbc6a63b3bbe3daf" ON "hub_tracking" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_f6e404de4dfbc6a63b3bbe3daf"`);
        await queryRunner.query(`DROP TABLE "hub_tracking"`);
    }

}

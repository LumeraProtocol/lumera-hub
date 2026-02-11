import { MigrationInterface, QueryRunner } from "typeorm";

export class Tracking1770619499666 implements MigrationInterface {
    name = 'Tracking1770619499666'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tracking" ("date" varchar(20) PRIMARY KEY NOT NULL, "delegate" bigint DEFAULT (0), "delegate_lume" double DEFAULT (0), "redelegate" bigint DEFAULT (0), "redelegate_lume" double DEFAULT (0), "unstaking" bigint DEFAULT (0), "unstaking_lume" double DEFAULT (0), "claim" bigint DEFAULT (0), "claim_lume" double DEFAULT (0), "cascade_upload" bigint DEFAULT (0), "cascade_image" bigint DEFAULT (0), "cascade_video" bigint DEFAULT (0), "cascade_program" bigint DEFAULT (0), "cascade_archive" bigint DEFAULT (0), "cascade_document" bigint DEFAULT (0), "cascade_other" bigint DEFAULT (0), "cascade_total_price" bigint DEFAULT (0), "cascade_total_fee" bigint DEFAULT (0), "total_address" integer DEFAULT (0), "new_address" integer DEFAULT (0), "total_transaction" bigint DEFAULT (0), "transaction_extra" text, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e49dc0922d7eb0a938e119df47" ON "tracking" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_e49dc0922d7eb0a938e119df47"`);
        await queryRunner.query(`DROP TABLE "tracking"`);
    }

}

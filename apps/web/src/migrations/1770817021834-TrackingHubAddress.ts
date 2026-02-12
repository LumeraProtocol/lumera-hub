import { MigrationInterface, QueryRunner } from "typeorm";

export class TrackingHubAddress1770817021834 implements MigrationInterface {
    name = 'TrackingHubAddress1770817021834'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "tracking_hub_address" ("code" varchar(50) PRIMARY KEY NOT NULL, "address" text NOT NULL, "date" varchar(20) NOT NULL, "total_transaction" bigint DEFAULT (0), "total_connected" bigint DEFAULT (0), "extra_info" text, "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_ba2bc7b1f47ce5299ef8c82dfe" ON "tracking_hub_address" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_532e8c6011e468b140e4501ac4" ON "tracking_hub_address" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_532e8c6011e468b140e4501ac4"`);
        await queryRunner.query(`DROP INDEX "IDX_ba2bc7b1f47ce5299ef8c82dfe"`);
        await queryRunner.query(`DROP TABLE "tracking_hub_address"`);
    }

}

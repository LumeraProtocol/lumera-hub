import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterHubAddressConnectedLog1770978109390 implements MigrationInterface {
    name = 'AlterHubAddressConnectedLog1770978109390'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_11b9d936aa5498eca4fc5df427"`);
        await queryRunner.query(`CREATE TABLE "temporary_hub_address" ("address" text PRIMARY KEY NOT NULL, "total_transaction" bigint DEFAULT (0), "total_connected" bigint DEFAULT (0), "extra_info" text, "first_connected" varchar(30), "last_connected" varchar(30), "first_action_timestamp" varchar(30), "acquisition_source" varchar(150))`);
        await queryRunner.query(`INSERT INTO "temporary_hub_address"("address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp") SELECT "address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp" FROM "hub_address"`);
        await queryRunner.query(`DROP TABLE "hub_address"`);
        await queryRunner.query(`ALTER TABLE "temporary_hub_address" RENAME TO "hub_address"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_11b9d936aa5498eca4fc5df427" ON "hub_address" ("address") `);
        await queryRunner.query(`DROP INDEX "IDX_80497d79a2b896c932965a8b0f"`);
        await queryRunner.query(`DROP INDEX "IDX_7d759963263bd04a7f5293ec6b"`);
        await queryRunner.query(`CREATE TABLE "temporary_hub_address_connected_log" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "address" text NOT NULL, "ip" varchar(20), "browser" varchar(20), "other_info" text, "created_at" varchar(25) NOT NULL, "acquisition_source" varchar(150))`);
        await queryRunner.query(`INSERT INTO "temporary_hub_address_connected_log"("id", "address", "ip", "browser", "other_info", "created_at") SELECT "id", "address", "ip", "browser", "other_info", "created_at" FROM "hub_address_connected_log"`);
        await queryRunner.query(`DROP TABLE "hub_address_connected_log"`);
        await queryRunner.query(`ALTER TABLE "temporary_hub_address_connected_log" RENAME TO "hub_address_connected_log"`);
        await queryRunner.query(`CREATE INDEX "IDX_80497d79a2b896c932965a8b0f" ON "hub_address_connected_log" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "IDX_7d759963263bd04a7f5293ec6b" ON "hub_address_connected_log" ("address") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_7d759963263bd04a7f5293ec6b"`);
        await queryRunner.query(`DROP INDEX "IDX_80497d79a2b896c932965a8b0f"`);
        await queryRunner.query(`ALTER TABLE "hub_address_connected_log" RENAME TO "temporary_hub_address_connected_log"`);
        await queryRunner.query(`CREATE TABLE "hub_address_connected_log" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "address" text NOT NULL, "ip" varchar(20), "browser" varchar(20), "other_info" text, "created_at" varchar(25) NOT NULL)`);
        await queryRunner.query(`INSERT INTO "hub_address_connected_log"("id", "address", "ip", "browser", "other_info", "created_at") SELECT "id", "address", "ip", "browser", "other_info", "created_at" FROM "temporary_hub_address_connected_log"`);
        await queryRunner.query(`DROP TABLE "temporary_hub_address_connected_log"`);
        await queryRunner.query(`CREATE INDEX "IDX_7d759963263bd04a7f5293ec6b" ON "hub_address_connected_log" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_80497d79a2b896c932965a8b0f" ON "hub_address_connected_log" ("created_at") `);
        await queryRunner.query(`DROP INDEX "IDX_11b9d936aa5498eca4fc5df427"`);
        await queryRunner.query(`ALTER TABLE "hub_address" RENAME TO "temporary_hub_address"`);
        await queryRunner.query(`CREATE TABLE "hub_address" ("address" text PRIMARY KEY NOT NULL, "total_transaction" bigint DEFAULT (0), "total_connected" bigint DEFAULT (0), "extra_info" text, "first_connected" varchar(30), "last_connected" varchar(30), "first_action_timestamp" varchar(30))`);
        await queryRunner.query(`INSERT INTO "hub_address"("address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp") SELECT "address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp" FROM "temporary_hub_address"`);
        await queryRunner.query(`DROP TABLE "temporary_hub_address"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_11b9d936aa5498eca4fc5df427" ON "hub_address" ("address") `);
    }

}

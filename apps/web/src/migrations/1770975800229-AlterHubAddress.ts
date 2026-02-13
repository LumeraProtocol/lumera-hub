import { MigrationInterface, QueryRunner } from "typeorm";

export class AlterHubAddress1770975800229 implements MigrationInterface {
    name = 'AlterHubAddress1770975800229'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_11b9d936aa5498eca4fc5df427"`);
        await queryRunner.query(`CREATE TABLE "temporary_hub_address" ("address" text PRIMARY KEY NOT NULL, "total_transaction" bigint DEFAULT (0), "total_connected" bigint DEFAULT (0), "extra_info" text, "first_connected" varchar(30), "last_connected" varchar(30), "first_action_timestamp" varchar(30), "acquisition_source" varchar(150))`);
        await queryRunner.query(`INSERT INTO "temporary_hub_address"("address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp") SELECT "address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp" FROM "hub_address"`);
        await queryRunner.query(`DROP TABLE "hub_address"`);
        await queryRunner.query(`ALTER TABLE "temporary_hub_address" RENAME TO "hub_address"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_11b9d936aa5498eca4fc5df427" ON "hub_address" ("address") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_11b9d936aa5498eca4fc5df427"`);
        await queryRunner.query(`ALTER TABLE "hub_address" RENAME TO "temporary_hub_address"`);
        await queryRunner.query(`CREATE TABLE "hub_address" ("address" text PRIMARY KEY NOT NULL, "total_transaction" bigint DEFAULT (0), "total_connected" bigint DEFAULT (0), "extra_info" text, "first_connected" varchar(30), "last_connected" varchar(30), "first_action_timestamp" varchar(30))`);
        await queryRunner.query(`INSERT INTO "hub_address"("address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp") SELECT "address", "total_transaction", "total_connected", "extra_info", "first_connected", "last_connected", "first_action_timestamp" FROM "temporary_hub_address"`);
        await queryRunner.query(`DROP TABLE "temporary_hub_address"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_11b9d936aa5498eca4fc5df427" ON "hub_address" ("address") `);
    }

}

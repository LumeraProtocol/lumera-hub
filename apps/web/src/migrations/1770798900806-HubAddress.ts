import { MigrationInterface, QueryRunner } from "typeorm";

export class HubAddress1770798900806 implements MigrationInterface {
    name = 'HubAddress1770798900806'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hub_address" ("address" text PRIMARY KEY NOT NULL, "total_transaction" bigint DEFAULT (0), "total_connected" bigint DEFAULT (0), "extra_info" text, "first_connected" varchar(30), "last_connected" varchar(30))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_11b9d936aa5498eca4fc5df427" ON "hub_address" ("address") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_11b9d936aa5498eca4fc5df427"`);
        await queryRunner.query(`DROP TABLE "hub_address"`);
    }

}

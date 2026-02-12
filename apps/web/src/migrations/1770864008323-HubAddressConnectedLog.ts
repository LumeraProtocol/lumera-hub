import { MigrationInterface, QueryRunner } from "typeorm";

export class HubAddressConnectedLog1770864008323 implements MigrationInterface {
    name = 'HubAddressConnectedLog1770864008323'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hub_address_connected_log" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "address" text NOT NULL, "ip" varchar(20), "browser" varchar(20), "other_info" text, "created_at" varchar(25) NOT NULL)`);
        await queryRunner.query(`CREATE INDEX "IDX_7d759963263bd04a7f5293ec6b" ON "hub_address_connected_log" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_80497d79a2b896c932965a8b0f" ON "hub_address_connected_log" ("created_at") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_80497d79a2b896c932965a8b0f"`);
        await queryRunner.query(`DROP INDEX "IDX_7d759963263bd04a7f5293ec6b"`);
        await queryRunner.query(`DROP TABLE "hub_address_connected_log"`);
    }

}

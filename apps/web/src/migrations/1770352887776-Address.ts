import { MigrationInterface, QueryRunner } from "typeorm";

export class Address1770352887776 implements MigrationInterface {
    name = 'Address1770352887776'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "address" ("address" text PRIMARY KEY NOT NULL, "timestamp" varchar(30), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_0a1ed89729fa10ba8b81b99f30" ON "address" ("address") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_0a1ed89729fa10ba8b81b99f30"`);
        await queryRunner.query(`DROP TABLE "address"`);
    }

}

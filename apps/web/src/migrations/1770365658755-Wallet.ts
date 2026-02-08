import { MigrationInterface, QueryRunner } from "typeorm";

export class Wallet1770365658755 implements MigrationInterface {
    name = 'Wallet1770365658755'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wallet" ("date" varchar(20) PRIMARY KEY NOT NULL, "total_address" integer DEFAULT (0), "new_address" integer DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_793b5136566209bf0423335a37" ON "wallet" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_793b5136566209bf0423335a37"`);
        await queryRunner.query(`DROP TABLE "wallet"`);
    }

}

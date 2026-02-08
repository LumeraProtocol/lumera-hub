import { MigrationInterface, QueryRunner } from "typeorm";

export class Staking1770365479364 implements MigrationInterface {
    name = 'Staking1770365479364'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "staking" ("date" varchar(20) PRIMARY KEY NOT NULL, "delegate" bigint DEFAULT (0), "redelegate" bigint DEFAULT (0), "unstaking" bigint DEFAULT (0), "claim" bigint DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3d6cd006f741ab6496a79061bd" ON "staking" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_3d6cd006f741ab6496a79061bd"`);
        await queryRunner.query(`DROP TABLE "staking"`);
    }

}

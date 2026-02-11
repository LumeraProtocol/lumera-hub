import { MigrationInterface, QueryRunner } from "typeorm";

export class SyncState1770616451009 implements MigrationInterface {
    name = 'SyncState1770616451009'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sync_state" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "last_sync" varchar(255) NOT NULL)`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_39422954a5e0bce10e2e364371" ON "sync_state" ("last_sync") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_39422954a5e0bce10e2e364371"`);
        await queryRunner.query(`DROP TABLE "sync_state"`);
    }

}

import { MigrationInterface, QueryRunner } from "typeorm";

export class Action1770454743272 implements MigrationInterface {
    name = 'Action1770454743272'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "action" ("date" varchar(20) PRIMARY KEY NOT NULL, "total" bigint DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_51c78f7dbdc63cdfb816e74aab" ON "action" ("date") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_51c78f7dbdc63cdfb816e74aab"`);
        await queryRunner.query(`DROP TABLE "action"`);
    }

}

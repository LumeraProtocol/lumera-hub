import { MigrationInterface, QueryRunner } from "typeorm";

export class Action1769425900305 implements MigrationInterface {
    name = 'Action1769425900305'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "action" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "wallet_address" text NOT NULL, "action_type" smallint NOT NULL, "timestamp" integer NOT NULL, "tx_hash" text, "task_id" text)`);
        await queryRunner.query(`CREATE INDEX "IDX_12a0c4a344dbaebcd68c8f3d1e" ON "action" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_4213cb14224707b4789d731d8e" ON "action" ("wallet_address", "timestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_4213cb14224707b4789d731d8e"`);
        await queryRunner.query(`DROP INDEX "IDX_12a0c4a344dbaebcd68c8f3d1e"`);
        await queryRunner.query(`DROP TABLE "action"`);
    }

}

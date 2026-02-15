import { MigrationInterface, QueryRunner } from "typeorm";

export class HubTransaction1771140097640 implements MigrationInterface {
    name = 'HubTransaction1771140097640'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "hub_transaction" ("hash" varchar(120) PRIMARY KEY NOT NULL, "timestamp" varchar(30), "message_type" varchar(255) NOT NULL, "creator" varchar(255), "price" bigint DEFAULT (0), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_250d1620e20f6851902b8850e7" ON "hub_transaction" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "IDX_3685acdee9832d9c3da694366f" ON "hub_transaction" ("message_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_5d716af178d5075ecb18d4b753" ON "hub_transaction" ("creator") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_5d716af178d5075ecb18d4b753"`);
        await queryRunner.query(`DROP INDEX "IDX_3685acdee9832d9c3da694366f"`);
        await queryRunner.query(`DROP INDEX "IDX_250d1620e20f6851902b8850e7"`);
        await queryRunner.query(`DROP TABLE "hub_transaction"`);
    }

}

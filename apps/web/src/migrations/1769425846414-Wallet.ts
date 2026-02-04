import { MigrationInterface, QueryRunner } from "typeorm";

export class Wallet1769425846414 implements MigrationInterface {
    name = 'Wallet1769425846414'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "wallet" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "address" text NOT NULL, "first_connected" integer NOT NULL, CONSTRAINT "UQ_1dcc9f5fd49e3dc52c6d2393c53" UNIQUE ("address"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_1dcc9f5fd49e3dc52c6d2393c5" ON "wallet" ("address") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_1dcc9f5fd49e3dc52c6d2393c5"`);
        await queryRunner.query(`DROP TABLE "wallet"`);
    }

}

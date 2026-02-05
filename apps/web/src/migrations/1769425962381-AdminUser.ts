import { MigrationInterface, QueryRunner } from "typeorm";

export class AdminUser1769425962381 implements MigrationInterface {
    name = 'AdminUser1769425962381'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "admin_users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "email" varchar(255) NOT NULL, "passwordHash" varchar(255) NOT NULL, "fullName" varchar(100), "isActive" boolean NOT NULL DEFAULT (0), "createdAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), "updatedAt" datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP), CONSTRAINT "UQ_dcd0c8a4b10af9c986e510b9ecc" UNIQUE ("email"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_dcd0c8a4b10af9c986e510b9ec" ON "admin_users" ("email") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_dcd0c8a4b10af9c986e510b9ec"`);
        await queryRunner.query(`DROP TABLE "admin_users"`);
    }

}

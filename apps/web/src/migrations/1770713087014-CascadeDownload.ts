import { MigrationInterface, QueryRunner } from "typeorm";

export class CascadeDownload1770713087014 implements MigrationInterface {
    name = 'CascadeDownload1770713087014'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "cascade_download" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "date" varchar(25) NOT NULL, "address" text NOT NULL, "action_id" varchar(10) NOT NULL, "file_type" varchar(10) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_16412325e2e34c3a86643c964c" ON "cascade_download" ("date") `);
        await queryRunner.query(`CREATE INDEX "IDX_b048a70c68a0ec250bed17b8a5" ON "cascade_download" ("address") `);
        await queryRunner.query(`CREATE INDEX "IDX_3a8763f33a553ee8736b984404" ON "cascade_download" ("file_type") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_3a8763f33a553ee8736b984404"`);
        await queryRunner.query(`DROP INDEX "IDX_b048a70c68a0ec250bed17b8a5"`);
        await queryRunner.query(`DROP INDEX "IDX_16412325e2e34c3a86643c964c"`);
        await queryRunner.query(`DROP TABLE "cascade_download"`);
    }

}

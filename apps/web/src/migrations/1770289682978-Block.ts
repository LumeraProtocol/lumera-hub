import { MigrationInterface, QueryRunner } from "typeorm";

export class Block1770289682978 implements MigrationInterface {
    name = 'Block1770289682978'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "blocks" ("height" bigint PRIMARY KEY NOT NULL, "chain_id" varchar(255) NOT NULL, "time" varchar(30) NOT NULL, "block_hash" varchar(255) NOT NULL, "part_set_total" integer, "part_set_hash" varchar(255), "version_block" varchar(50) NOT NULL, "version_app" varchar(50) NOT NULL, "last_block_hash" varchar(255), "last_part_total" integer, "last_part_hash" varchar(255), "last_commit_hash" varchar(255) NOT NULL, "data_hash" varchar(255) NOT NULL, "validators_hash" varchar(255) NOT NULL, "next_validators_hash" varchar(255) NOT NULL, "consensus_hash" varchar(255) NOT NULL, "app_hash" varchar(255) NOT NULL, "last_results_hash" varchar(255) NOT NULL, "evidence_hash" varchar(255) NOT NULL, "proposer_address" varchar(255) NOT NULL, "txs" text, "last_commit_height" bigint, "last_commit_round" integer, "last_commit_block_hash" varchar(255), "last_commit_part_total" integer, "last_commit_part_hash" varchar(255), "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_6597a67db9214ae1b2bacb2250" ON "blocks" ("time") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_6597a67db9214ae1b2bacb2250"`);
        await queryRunner.query(`DROP TABLE "blocks"`);
    }

}

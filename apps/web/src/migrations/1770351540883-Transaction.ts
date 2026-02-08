import { MigrationInterface, QueryRunner } from "typeorm";

export class Transaction1770351540883 implements MigrationInterface {
    name = 'Transaction1770351540883'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "transactions" ("tx_hash" varchar(64) PRIMARY KEY NOT NULL, "height" bigint NOT NULL, "code" integer NOT NULL, "codespace" varchar(50), "gas_wanted" integer, "gas_used" integer, "timestamp" varchar(30), "memo" text, "timeout_height" bigint NOT NULL DEFAULT (0), "message_type" varchar(255) NOT NULL, "creator" varchar(255), "action_type" varchar(100), "data_hash" varchar(255), "file_name" varchar(255), "price" varchar(100), "expiration_time" bigint, "file_size_kbs" integer, "rq_ids_ic" integer, "validator_address" varchar(255), "sequence" integer, "fee_amount" varchar(100), "fee_denom" varchar(50) NOT NULL DEFAULT ('ulume'), "gas_limit" integer, "signer_pubkey" varchar(255), "sign_mode" varchar(100), "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_402bee1a4d40c17fe76320ae1f" ON "transactions" ("height") `);
        await queryRunner.query(`CREATE INDEX "IDX_b60f0600d3ce9e31365cb19aea" ON "transactions" ("message_type") `);
        await queryRunner.query(`CREATE INDEX "IDX_c0fc12af9883058be3f2209877" ON "transactions" ("creator") `);
        await queryRunner.query(`CREATE INDEX "IDX_270472d1158e2464502fce493c" ON "transactions" ("data_hash") `);
        await queryRunner.query(`CREATE INDEX "IDX_68baa2b36c35a2c34d7baae854" ON "transactions" ("file_name") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_68baa2b36c35a2c34d7baae854"`);
        await queryRunner.query(`DROP INDEX "IDX_270472d1158e2464502fce493c"`);
        await queryRunner.query(`DROP INDEX "IDX_c0fc12af9883058be3f2209877"`);
        await queryRunner.query(`DROP INDEX "IDX_b60f0600d3ce9e31365cb19aea"`);
        await queryRunner.query(`DROP INDEX "IDX_402bee1a4d40c17fe76320ae1f"`);
        await queryRunner.query(`DROP TABLE "transactions"`);
    }

}

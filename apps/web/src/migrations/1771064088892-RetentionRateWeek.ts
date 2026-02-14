import { MigrationInterface, QueryRunner } from "typeorm";

export class RetentionRateWeek1771064088892 implements MigrationInterface {
    name = 'RetentionRateWeek1771064088892'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "retention_rate_week" ("hash" varchar(50) PRIMARY KEY NOT NULL, "address" text NOT NULL, "week" integer NOT NULL, "year" integer NOT NULL, "start_date" varchar(30) NOT NULL, "end_date" varchar(30) NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_8b0e728d8bf75a960fc20f58f5" ON "retention_rate_week" ("week") `);
        await queryRunner.query(`CREATE INDEX "IDX_5f9c4648e34ca7da5935f0e84f" ON "retention_rate_week" ("year") `);
        await queryRunner.query(`CREATE INDEX "IDX_22e8d783984422c87da97233a5" ON "retention_rate_week" ("start_date") `);
        await queryRunner.query(`CREATE INDEX "IDX_676646948c6d8948e27abcc49c" ON "retention_rate_week" ("end_date") `);
        await queryRunner.query(`CREATE TABLE "retention_rate_week_details" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "week_hash" varchar(50) NOT NULL, "week" integer NOT NULL, "year" integer NOT NULL, "total_activation" integer DEFAULT (0), "cosmos_authz_v1beta1_MsgExec" integer DEFAULT (0), "cosmos_authz_v1beta1_MsgGrant" integer DEFAULT (0), "cosmos_authz_v1beta1_MsgRevoke" integer DEFAULT (0), "cosmos_bank_v1beta1_MsgSend" integer DEFAULT (0), "cosmos_distribution_v1beta1_MsgWithdrawDelegatorReward" integer DEFAULT (0), "cosmos_gov_v1_MsgSubmitProposal" integer DEFAULT (0), "cosmos_gov_v1_MsgVote" integer DEFAULT (0), "cosmos_gov_v1beta1_MsgDeposit" integer DEFAULT (0), "cosmos_gov_v1beta1_MsgSubmitProposal" integer DEFAULT (0), "cosmos_gov_v1beta1_MsgVote" integer DEFAULT (0), "cosmos_slashing_v1beta1_MsgUnjail" integer DEFAULT (0), "cosmos_staking_v1beta1_MsgBeginRedelegate" integer DEFAULT (0), "cosmos_staking_v1beta1_MsgCreateValidator" integer DEFAULT (0), "cosmos_staking_v1beta1_MsgDelegate" integer DEFAULT (0), "cosmos_staking_v1beta1_MsgEditValidator" integer DEFAULT (0), "cosmos_staking_v1beta1_MsgUndelegate" integer DEFAULT (0), "ibc_core_client_v1_MsgCreateClient" integer DEFAULT (0), "ibc_core_client_v1_MsgUpdateClient" integer DEFAULT (0), "lumera_action_v1_MsgApproveAction" integer DEFAULT (0), "lumera_action_v1_MsgFinalizeAction" integer DEFAULT (0), "lumera_action_v1_MsgRequestAction" integer DEFAULT (0), "lumera_supernode_v1_MsgRegisterSupernode" integer DEFAULT (0), "lumera_supernode_v1_MsgReportSupernodeMetrics" integer DEFAULT (0), "lumera_supernode_v1_MsgStartSupernode" integer DEFAULT (0), "lumera_supernode_v1_MsgUpdateSupernode" integer DEFAULT (0), "created_at" datetime NOT NULL DEFAULT (datetime('now')))`);
        await queryRunner.query(`CREATE INDEX "IDX_02ef44006a872c552d57b9351d" ON "retention_rate_week_details" ("week") `);
        await queryRunner.query(`CREATE INDEX "IDX_6e734fd327d37cf21ac7fecf50" ON "retention_rate_week_details" ("year") `);
        await queryRunner.query(`CREATE INDEX "IDX_100aeaec65d0f658f6b98bc630" ON "retention_rate_week_details" ("total_activation") `);
        await queryRunner.query(`CREATE INDEX "IDX_e1a0e9a0746553e97229ec2d7a" ON "retention_rate_week_details" ("cosmos_authz_v1beta1_MsgExec") `);
        await queryRunner.query(`CREATE INDEX "IDX_2a018e73c5f0eab63311fca6c4" ON "retention_rate_week_details" ("cosmos_authz_v1beta1_MsgGrant") `);
        await queryRunner.query(`CREATE INDEX "IDX_dda5b1f328b75ae7204a4baec4" ON "retention_rate_week_details" ("cosmos_authz_v1beta1_MsgRevoke") `);
        await queryRunner.query(`CREATE INDEX "IDX_926c75268d09a0593bd7c635f5" ON "retention_rate_week_details" ("cosmos_bank_v1beta1_MsgSend") `);
        await queryRunner.query(`CREATE INDEX "IDX_547b3813e50319a727a01927b2" ON "retention_rate_week_details" ("cosmos_distribution_v1beta1_MsgWithdrawDelegatorReward") `);
        await queryRunner.query(`CREATE INDEX "IDX_507fe9a95c9d020c6716f0c152" ON "retention_rate_week_details" ("cosmos_gov_v1_MsgSubmitProposal") `);
        await queryRunner.query(`CREATE INDEX "IDX_adaf5f0278cc4afbf93ad72fce" ON "retention_rate_week_details" ("cosmos_gov_v1_MsgVote") `);
        await queryRunner.query(`CREATE INDEX "IDX_f2c46e78dd96cb3f8c3990bbd7" ON "retention_rate_week_details" ("cosmos_gov_v1beta1_MsgDeposit") `);
        await queryRunner.query(`CREATE INDEX "IDX_fce07ccee0da33a7501dfc02ac" ON "retention_rate_week_details" ("cosmos_gov_v1beta1_MsgSubmitProposal") `);
        await queryRunner.query(`CREATE INDEX "IDX_aa71b4b8cb264f88abe8f066ff" ON "retention_rate_week_details" ("cosmos_gov_v1beta1_MsgVote") `);
        await queryRunner.query(`CREATE INDEX "IDX_c75c3678a3cad1104233ce153e" ON "retention_rate_week_details" ("cosmos_slashing_v1beta1_MsgUnjail") `);
        await queryRunner.query(`CREATE INDEX "IDX_a7cae7c5afd0fe1513337870ed" ON "retention_rate_week_details" ("cosmos_staking_v1beta1_MsgBeginRedelegate") `);
        await queryRunner.query(`CREATE INDEX "IDX_e3fec6cf6f6a9cb8b9e71698e5" ON "retention_rate_week_details" ("cosmos_staking_v1beta1_MsgCreateValidator") `);
        await queryRunner.query(`CREATE INDEX "IDX_dbd3919f7d8363c6fc0fae5a14" ON "retention_rate_week_details" ("cosmos_staking_v1beta1_MsgDelegate") `);
        await queryRunner.query(`CREATE INDEX "IDX_5c358d46e1ef6aa8603c7778c8" ON "retention_rate_week_details" ("cosmos_staking_v1beta1_MsgEditValidator") `);
        await queryRunner.query(`CREATE INDEX "IDX_b92173a30b76939ec3273c5b5a" ON "retention_rate_week_details" ("cosmos_staking_v1beta1_MsgUndelegate") `);
        await queryRunner.query(`CREATE INDEX "IDX_a4a3a986eb0b51ebbd0adda86a" ON "retention_rate_week_details" ("ibc_core_client_v1_MsgCreateClient") `);
        await queryRunner.query(`CREATE INDEX "IDX_0c8d9e2d9d1c2a2a5c104c10f4" ON "retention_rate_week_details" ("ibc_core_client_v1_MsgUpdateClient") `);
        await queryRunner.query(`CREATE INDEX "IDX_29d7e1ed794ec9e543b850036e" ON "retention_rate_week_details" ("lumera_action_v1_MsgApproveAction") `);
        await queryRunner.query(`CREATE INDEX "IDX_ff6243269c992b3dc6abd05f27" ON "retention_rate_week_details" ("lumera_action_v1_MsgFinalizeAction") `);
        await queryRunner.query(`CREATE INDEX "IDX_3faabc8f2c63c06d2e7fe97860" ON "retention_rate_week_details" ("lumera_action_v1_MsgRequestAction") `);
        await queryRunner.query(`CREATE INDEX "IDX_9a43f5c74cd410b43c65860a14" ON "retention_rate_week_details" ("lumera_supernode_v1_MsgRegisterSupernode") `);
        await queryRunner.query(`CREATE INDEX "IDX_119f3cc2bbfa26a76c59429d7f" ON "retention_rate_week_details" ("lumera_supernode_v1_MsgReportSupernodeMetrics") `);
        await queryRunner.query(`CREATE INDEX "IDX_3fe0f2cc756bb3fe8e18c01a9e" ON "retention_rate_week_details" ("lumera_supernode_v1_MsgStartSupernode") `);
        await queryRunner.query(`CREATE INDEX "IDX_d9038fbd810173d2ad0da36e30" ON "retention_rate_week_details" ("lumera_supernode_v1_MsgUpdateSupernode") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_d9038fbd810173d2ad0da36e30"`);
        await queryRunner.query(`DROP INDEX "IDX_3fe0f2cc756bb3fe8e18c01a9e"`);
        await queryRunner.query(`DROP INDEX "IDX_119f3cc2bbfa26a76c59429d7f"`);
        await queryRunner.query(`DROP INDEX "IDX_9a43f5c74cd410b43c65860a14"`);
        await queryRunner.query(`DROP INDEX "IDX_3faabc8f2c63c06d2e7fe97860"`);
        await queryRunner.query(`DROP INDEX "IDX_ff6243269c992b3dc6abd05f27"`);
        await queryRunner.query(`DROP INDEX "IDX_29d7e1ed794ec9e543b850036e"`);
        await queryRunner.query(`DROP INDEX "IDX_0c8d9e2d9d1c2a2a5c104c10f4"`);
        await queryRunner.query(`DROP INDEX "IDX_a4a3a986eb0b51ebbd0adda86a"`);
        await queryRunner.query(`DROP INDEX "IDX_b92173a30b76939ec3273c5b5a"`);
        await queryRunner.query(`DROP INDEX "IDX_5c358d46e1ef6aa8603c7778c8"`);
        await queryRunner.query(`DROP INDEX "IDX_dbd3919f7d8363c6fc0fae5a14"`);
        await queryRunner.query(`DROP INDEX "IDX_e3fec6cf6f6a9cb8b9e71698e5"`);
        await queryRunner.query(`DROP INDEX "IDX_a7cae7c5afd0fe1513337870ed"`);
        await queryRunner.query(`DROP INDEX "IDX_c75c3678a3cad1104233ce153e"`);
        await queryRunner.query(`DROP INDEX "IDX_aa71b4b8cb264f88abe8f066ff"`);
        await queryRunner.query(`DROP INDEX "IDX_fce07ccee0da33a7501dfc02ac"`);
        await queryRunner.query(`DROP INDEX "IDX_f2c46e78dd96cb3f8c3990bbd7"`);
        await queryRunner.query(`DROP INDEX "IDX_adaf5f0278cc4afbf93ad72fce"`);
        await queryRunner.query(`DROP INDEX "IDX_507fe9a95c9d020c6716f0c152"`);
        await queryRunner.query(`DROP INDEX "IDX_547b3813e50319a727a01927b2"`);
        await queryRunner.query(`DROP INDEX "IDX_926c75268d09a0593bd7c635f5"`);
        await queryRunner.query(`DROP INDEX "IDX_dda5b1f328b75ae7204a4baec4"`);
        await queryRunner.query(`DROP INDEX "IDX_2a018e73c5f0eab63311fca6c4"`);
        await queryRunner.query(`DROP INDEX "IDX_e1a0e9a0746553e97229ec2d7a"`);
        await queryRunner.query(`DROP INDEX "IDX_100aeaec65d0f658f6b98bc630"`);
        await queryRunner.query(`DROP INDEX "IDX_6e734fd327d37cf21ac7fecf50"`);
        await queryRunner.query(`DROP INDEX "IDX_02ef44006a872c552d57b9351d"`);
        await queryRunner.query(`DROP TABLE "retention_rate_week_details"`);
        await queryRunner.query(`DROP INDEX "IDX_676646948c6d8948e27abcc49c"`);
        await queryRunner.query(`DROP INDEX "IDX_22e8d783984422c87da97233a5"`);
        await queryRunner.query(`DROP INDEX "IDX_5f9c4648e34ca7da5935f0e84f"`);
        await queryRunner.query(`DROP INDEX "IDX_8b0e728d8bf75a960fc20f58f5"`);
        await queryRunner.query(`DROP TABLE "retention_rate_week"`);
    }

}

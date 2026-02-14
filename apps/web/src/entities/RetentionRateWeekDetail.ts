// src/entities/RetentionRateWeek_ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn } from "typeorm";

@Entity({ name: "retention_rate_week_details" })
export class RetentionRateWeekDetails {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  week_hash: string;

  @Index()
  @Column({ type: "int" })
  week: number;

  @Index()
  @Column({ type: "int" })
  year: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  total_activation: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_authz_v1beta1_MsgExec: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_authz_v1beta1_MsgGrant: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_authz_v1beta1_MsgRevoke: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_bank_v1beta1_MsgSend: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_distribution_v1beta1_MsgWithdrawDelegatorReward: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_gov_v1_MsgSubmitProposal: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_gov_v1_MsgVote: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_gov_v1beta1_MsgDeposit: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_gov_v1beta1_MsgSubmitProposal: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_gov_v1beta1_MsgVote: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_slashing_v1beta1_MsgUnjail: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_staking_v1beta1_MsgBeginRedelegate: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_staking_v1beta1_MsgCreateValidator: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_staking_v1beta1_MsgDelegate: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_staking_v1beta1_MsgEditValidator: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  cosmos_staking_v1beta1_MsgUndelegate: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  ibc_core_client_v1_MsgCreateClient: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  ibc_core_client_v1_MsgUpdateClient: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  lumera_action_v1_MsgApproveAction: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  lumera_action_v1_MsgFinalizeAction: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  lumera_action_v1_MsgRequestAction: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  lumera_supernode_v1_MsgRegisterSupernode: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  lumera_supernode_v1_MsgReportSupernodeMetrics: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  lumera_supernode_v1_MsgStartSupernode: number;

  @Index()
  @Column({ type: "int", default: 0, nullable: true })
  lumera_supernode_v1_MsgUpdateSupernode: number;

  @CreateDateColumn()
  created_at!: Date;
}

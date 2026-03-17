// src/entities/SnagLoyalty.ts
import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity({ name: "snag_loyalty" })
export class SnagLoyalty {
  @PrimaryColumn({ type: "varchar", length: 50 })
  id: string;

  @Column({ type: "varchar", length: 250 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Index()
  @Column({ type: "varchar", length: 25, nullable: true })
  endTime: string;

  @Index()
  @Column({ type: "varchar", length: 25, nullable: true })
  startTime: string;

  @Index()
  @Column({ type: "varchar", length: 25, nullable: true })
  rewardType: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  organizationId: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  websiteId: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  type: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  frequency: string;

  @Column({ type: 'bigint', nullable: true, default: 0 })
  amount: number;

  @Column({ type: "text", nullable: true })
  loyaltyRuleChain: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  createdAt: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  updatedAt: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  deletedAt: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  collectionAddress: string;

  @Column({ type: "varchar", length: 250, nullable: true })
  mediaUrl: string;

  @Column({ type: "text", nullable: true })
  metadata: string;

  @Column({ type: "varchar", length: 15, nullable: true })
  dappDeployedWithin: string;

  @Column({ type: "varchar", length: 15, nullable: true })
  dappDataWindow: string;

  @Column({ type: "text", nullable: true })
  config?: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  sprintID?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  loyaltyRuleGroupId?: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  loyaltyCurrencyId?: string;

  @Column({ type: "varchar", length: 25, nullable: true })
  claimType?: string;
}

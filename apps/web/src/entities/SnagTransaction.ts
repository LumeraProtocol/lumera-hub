// src/entities/SnagTransaction.ts
import { Entity, PrimaryColumn, Column, Index, UpdateDateColumn, CreateDateColumn } from "typeorm";

@Entity({ name: "snag_transaction" })
export class SnagTransaction {
  @PrimaryColumn({ type: "varchar", length: 50 })
  txHash: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  loyaltyRuleId: string;

  @Column({ type: "varchar", length: 150 })
  userId: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

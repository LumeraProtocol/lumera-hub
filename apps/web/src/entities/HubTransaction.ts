// src/entities/HubTransaction.ts
import { Entity, PrimaryColumn, Column, Index, UpdateDateColumn } from "typeorm";

@Entity({ name: "hub_transaction" })
export class HubTransaction {
  @PrimaryColumn({ type: "varchar", length: 120 })
  hash: string;

  @Index()
  @Column({ type: 'varchar', length: 30, nullable: true })
  timestamp?: string;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  message_type!: string;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  creator?: string;

  @Column({ type: 'bigint', default: 0, nullable: true })
  price?: number;

  @UpdateDateColumn()
  updated_at!: Date;
}

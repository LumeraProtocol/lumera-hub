// src/entities/SnagCurrency.ts
import { Entity, PrimaryColumn, Column, Index, UpdateDateColumn, CreateDateColumn } from "typeorm";

@Entity({ name: "snag_currency" })
export class SnagCurrency {
  @PrimaryColumn({ type: "varchar", length: 50 })
  id: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  name: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

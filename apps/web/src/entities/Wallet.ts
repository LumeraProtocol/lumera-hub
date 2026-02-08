// src/entities/Wallet.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
@Index(["date"], { unique: true })
export class Wallet {
  @PrimaryColumn({ type: "varchar", length: 20 })
  date: string;

  @Column({ type: 'int', default: 0, nullable: true })
  total_address?: number;

  @Column({ type: 'int', default: 0, nullable: true })
  new_address?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

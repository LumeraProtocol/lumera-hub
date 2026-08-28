// src/entities/Address.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
@Index(["address"], { unique: true })
export class Address {
  @PrimaryColumn({ type: "text" })
  address: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  timestamp?: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'tx' })
  type?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

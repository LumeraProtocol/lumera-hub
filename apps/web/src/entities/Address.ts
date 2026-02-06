// src/entities/Wallet.ts
import { Entity, PrimaryColumn, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
@Index(["address"], { unique: true })
export class Address {
  @PrimaryColumn({ type: "text" })
  address: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

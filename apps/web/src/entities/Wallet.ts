// src/entities/Wallet.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
@Index(["address"], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text", unique: true })
  address: string;

  @Column({ type: "integer" })
  first_connected: number;
}

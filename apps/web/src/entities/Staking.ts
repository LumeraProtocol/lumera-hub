// src/entities/Staking.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
@Index(["date"], { unique: true })
export class Staking {
  @PrimaryColumn({ type: "varchar", length: 20 })
  date: string;

  @Column({ type: 'bigint', default: 0, nullable: true })
  delegate?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  redelegate?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  unstaking?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  claim?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

// src/entities/Staking.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
@Index(["date"], { unique: true })
export class Tracking {
  @PrimaryColumn({ type: "varchar", length: 20 })
  date: string;

  @Column({ type: 'bigint', default: 0, nullable: true })
  delegate?: number;

  @Column({ type: 'double', default: 0, nullable: true })
  delegate_lume?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  redelegate?: number;

  @Column({ type: 'double', default: 0, nullable: true })
  redelegate_lume?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  unstaking?: number;

  @Column({ type: 'double', default: 0, nullable: true })
  unstaking_lume?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  claim?: number;

  @Column({ type: 'double', default: 0, nullable: true })
  claim_lume?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_upload?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_image?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_video?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_program?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_archive?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_document?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_other?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_total_price?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  cascade_total_fee?: number;

  @Column({ type: 'int', default: 0, nullable: true })
  total_address?: number;

  @Column({ type: 'int', default: 0, nullable: true })
  new_address?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total_transaction?: number;

  @Column({ type: 'text', nullable: true })
  transaction_extra?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

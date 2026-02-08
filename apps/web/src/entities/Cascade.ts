// src/entities/Cascade.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
@Index(["date"], { unique: true })
export class Cascade {
  @PrimaryColumn({ type: "varchar", length: 20 })
  date: string;

  @Column({ type: 'bigint', default: 0, nullable: true })
  upload?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  download?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  image?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  video?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  program?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  archive?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  document?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  other?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total_price?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total_fee?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

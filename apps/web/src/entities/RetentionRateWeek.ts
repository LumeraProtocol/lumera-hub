// src/entities/RetentionRateWeek.ts
import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from "typeorm";

@Entity({ name: "retention_rate_week" })
export class RetentionRateWeek {
  @PrimaryColumn({ type: "varchar", length: 50 })
  hash: string;

  @Column({ type: "text" })
  address: string;

  @Index()
  @Column({ type: "int" })
  week: number;

  @Index()
  @Column({ type: "int" })
  year: number;

  @Index()
  @Column({ type: "varchar", length: 30 })
  start_date: string;

  @Index()
  @Column({ type: "varchar", length: 30 })
  end_date: string;

  @CreateDateColumn()
  created_at!: Date;
}

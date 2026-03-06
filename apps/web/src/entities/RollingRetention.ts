// src/entities/RollingRetention.ts
import { Entity, PrimaryGeneratedColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "rolling_retention" })
export class RollingRetention {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "int" })
  total_actions: number;

  @Index()
  @Column({ type: "int" })
  total_users: number;

  @Index()
  @Column({ type: "varchar", length: 15, default: 'week' })
  type: string;

  @Index()
  @Column({ type: "varchar", length: 30 })
  start_date: string;

  @Index()
  @Column({ type: "varchar", length: 30 })
  end_date: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

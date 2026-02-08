// src/entities/Action.ts
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from "typeorm";

@Entity()
@Index(["date"], { unique: true })
export class Action {
  @PrimaryColumn({ type: "varchar", length: 20 })
  date: string;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total?: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

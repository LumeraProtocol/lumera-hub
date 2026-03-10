// src/entities/SnagUser.ts
import { Entity, PrimaryColumn, Column, Index, UpdateDateColumn, CreateDateColumn } from "typeorm";

@Entity({ name: "snag_user" })
export class SnagUser {
  @PrimaryColumn({ type: "varchar", length: 50 })
  snagAddress: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  lumeraAddress: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  userId: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

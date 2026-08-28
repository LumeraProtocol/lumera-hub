// src/entities/SnagCascadeStorage.ts
import { Entity, PrimaryColumn, Column, Index, UpdateDateColumn, CreateDateColumn } from "typeorm";

@Entity({ name: "snag_cascade_storage" })
export class SnagCascadeStorage {
  @PrimaryColumn({ type: "varchar", length: 50 })
  lumeraAddress: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  taskId: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

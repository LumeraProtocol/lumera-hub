// src/entities/SnagRefer.ts
import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from "typeorm";

@Entity({ name: "snag_refer" })
export class SnagRefer {
  @PrimaryColumn({ type: "varchar", length: 50 })
  lumeraAddress: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  referAddress: string;

  @Index()
  @Column({ type: "int", default: 0 })
  claim: number;

  @CreateDateColumn()
  created_at!: Date;
}

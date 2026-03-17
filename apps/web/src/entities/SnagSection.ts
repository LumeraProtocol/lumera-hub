// src/entities/SnagSection.ts
import { Entity, PrimaryColumn, Column, Index, UpdateDateColumn, CreateDateColumn } from "typeorm";

@Entity({ name: "snag_section" })
export class SnagSection {
  @PrimaryColumn({ type: "varchar", length: 50 })
  id: string;

  @Index()
  @Column({ type: "varchar", length: 200 })
  name: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

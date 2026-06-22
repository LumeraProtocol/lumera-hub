// src/entities/SnagRefer.ts
import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from "typeorm";

@Entity({ name: "favorites" })
export class Favorites {
  @PrimaryColumn({ type: "varchar", length: 50 })
  lumeraAddress: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  supernodeAccount: string;

  @CreateDateColumn()
  created_at!: Date;
}

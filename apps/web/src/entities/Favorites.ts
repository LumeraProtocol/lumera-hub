// src/entities/SnagRefer.ts
import { Entity, Column, Index, CreateDateColumn, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "favorites" })
export class Favorites {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 50 })
  lumeraAddress: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  supernodeAccount: string;

  @CreateDateColumn()
  created_at!: Date;
}

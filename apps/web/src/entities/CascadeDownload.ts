// src/entities/CascadeDownload.ts
import {
  Entity,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity({ name: "cascade_download" })
export class CascadeDownload {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "varchar", length: 25 })
  date: string;

  @Index()
  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 10 })
  action_id: string;

  @Index()
  @Column({ type: 'varchar', length: 10 })
  file_type: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

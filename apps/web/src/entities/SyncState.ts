// src/entities/SyncState.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity({ name: "sync_state" })
@Index(["last_sync"], { unique: true })
export class SyncState {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 255 })
  last_sync: string;
}

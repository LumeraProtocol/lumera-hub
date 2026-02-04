// src/entities/Action.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";

@Entity()
@Index(["wallet_address", "timestamp"])
@Index(["timestamp"])
export class Action {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "text" })
  wallet_address: string;

  @Column({ type: "smallint" })
  action_type: number;

  @Column({ type: "integer" })
  timestamp: number;

  @Column({ type: "text", nullable: true })
  tx_hash?: string;

  @Column({ type: "text", nullable: true })
  task_id?: string;
}

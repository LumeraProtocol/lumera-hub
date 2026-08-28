// src/entities/HubAddress.ts
import { Entity, PrimaryColumn, Column, Index } from "typeorm";

@Entity({ name: "hub_address" })
@Index(["address"], { unique: true })
export class HubAddress {
  @PrimaryColumn({ type: "text" })
  address: string;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total_transaction?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total_connected?: number;

  @Column({ type: 'text', nullable: true })
  extra_info?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  first_connected?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  last_connected?: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  first_action_timestamp?: string;

  @Column({ type: 'varchar', length: 150, nullable: true, default: 'Direct' })
  acquisition_source?: string;
}

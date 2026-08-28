// src/entities/HubAddressConnectedLog.ts
import { Entity, Column, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "hub_address_connected_log" })
export class HubAddressConnectedLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: "text" })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  ip?: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  browser?: string;

  @Column({ type: 'text', nullable: true })
  other_info?: string;

  @Column({ type: 'varchar', length: 150, nullable: true, default: 'Direct' })
  acquisition_source?: string;

  @Index()
  @Column({ type: "varchar", length: 25 })
  created_at: string;
}

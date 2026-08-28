// src/entities/TrackingHubAddress.ts
import { Entity, PrimaryColumn, Column, Index, UpdateDateColumn } from "typeorm";

@Entity({ name: "tracking_hub_address" })
export class TrackingHubAddress {
  @PrimaryColumn({ type: "varchar", length: 50 })
  code: string;

  @Index()
  @Column({ type: "text" })
  address: string;

  @Index()
  @Column({ type: "varchar", length: 20 })
  date: string;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total_transaction?: number;

  @Column({ type: 'bigint', default: 0, nullable: true })
  total_connected?: number;

  @Column({ type: 'text', nullable: true })
  extra_info?: string;

  @UpdateDateColumn()
  updated_at!: Date;
}

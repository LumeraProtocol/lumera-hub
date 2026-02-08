// src/entities/Transaction.ts
import { Entity, PrimaryColumn, Column, Index, CreateDateColumn } from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  tx_hash!: string;

  @Column({ type: 'bigint' })
  @Index()
  height!: string;

  @Column({ type: 'int' })
  code!: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  codespace?: string;

  @Column({ type: 'int', nullable: true })
  gas_wanted?: number;

  @Column({ type: 'int', nullable: true })
  gas_used?: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  timestamp?: string;

  @Column({ type: 'text', nullable: true })
  memo?: string;

  @Column({ type: 'bigint', default: 0 })
  timeout_height!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index()
  message_type!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  creator?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  action_type?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  data_hash?: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  file_name?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  price?: string;

  @Column({ type: 'bigint', nullable: true })
  expiration_time?: string;

  @Column({ type: 'int', nullable: true })
  file_size_kbs?: number;

  @Column({ type: 'int', nullable: true })
  rq_ids_ic?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  validator_address?: string;

  @Column({ type: 'int', nullable: true })
  sequence?: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fee_amount?: string;

  @Column({ type: 'varchar', length: 50, default: 'ulume' })
  fee_denom!: string;

  @Column({ type: 'int', nullable: true })
  gas_limit?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  signer_pubkey?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sign_mode?: string;

  @CreateDateColumn()
  created_at!: Date;
}

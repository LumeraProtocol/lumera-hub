// src/entities/Block.ts
import { Entity, PrimaryColumn, Column, Index, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('blocks')
export class Block {
  @PrimaryColumn({ type: 'bigint' })
  height!: string;

  @Column({ type: 'varchar', length: 255 })
  chain_id!: string;

  @Index()
  @Column({ type: 'varchar', length: 30 })
  time!: string;

  @Column({ type: 'varchar', length: 255 })
  block_hash!: string;

  @Column({ type: 'int', nullable: true })
  part_set_total?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  part_set_hash?: string;

  @Column({ type: 'varchar', length: 50 })
  version_block!: string;

  @Column({ type: 'varchar', length: 50 })
  version_app!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_block_hash?: string;

  @Column({ type: 'int', nullable: true })
  last_part_total?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_part_hash?: string;

  @Column({ type: 'varchar', length: 255 })
  last_commit_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  data_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  validators_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  next_validators_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  consensus_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  app_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  last_results_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  evidence_hash!: string;

  @Column({ type: 'varchar', length: 255 })
  proposer_address!: string;

  @Column({ type: 'text', nullable: true })
  txs!: string;

  @Column({ type: 'bigint', nullable: true })
  last_commit_height?: string;

  @Column({ type: 'int', nullable: true })
  last_commit_round?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_commit_block_hash?: string;

  @Column({ type: 'int', nullable: true })
  last_commit_part_total?: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  last_commit_part_hash?: string;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

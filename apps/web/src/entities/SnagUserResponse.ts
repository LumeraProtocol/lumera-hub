// src/entities/SnagUserResponse.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";
import { SnagLoyalty } from "./SnagLoyalty";

@Entity({ name: "snag_user_response" })
export class SnagUserResponse {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 50 })
  loyaltyRuleId: string;

  @Column({ type: "text" })
  content: string;

  @ManyToOne(() => SnagLoyalty, { nullable: true })
  @JoinColumn({ name: "loyaltyRuleId" })
  loyaltyRule: SnagLoyalty;

  @Index()
  @Column({ type: "varchar", length: 150 })
  userId: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  lumeraAddress: string;

  @Index()
  @Column({ type: "varchar", length: 50 })
  snagAddress: string;

  @Index()
  @Column({ type: "varchar", length: 25 })
  status: string;

  @Index()
  @Column({ type: "int", nullable: true })
  adminUserId: number;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}

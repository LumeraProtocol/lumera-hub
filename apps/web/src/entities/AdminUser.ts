// src/entities/AdminUser.ts
import { Entity, PrimaryGeneratedColumn, Column, Index } from "typeorm";
import * as bcrypt from 'bcryptjs';

@Entity({ name: "admin_users" })
@Index(["email"], { unique: true })
export class AdminUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 255, unique: true })
  email!: string;

  @Column({ type: "varchar", length: 255, select: false })
  passwordHash!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  fullName?: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  walletAddress?: string;

  @Column({ type: "boolean", default: false })
  isActive!: boolean;

  @Column({ type: "datetime", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({
    type: "datetime",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;

  async comparePassword(plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, this.passwordHash);
  }
}

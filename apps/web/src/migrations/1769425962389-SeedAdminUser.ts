import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AdminUser } from '@/entities/AdminUser';

export class SeedAdminUser1769425962389 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';
    const plainPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '';

    if (!plainPassword || !email) {
      console.warn('Missing ADMIN_EMAIL or ADMIN_PASSWORD in env → skip seeding admin user');
      return;
    }

    const adminRepo = queryRunner.manager.getRepository(AdminUser);

    const exists = await adminRepo.findOne({ where: { email } });
    if (exists) {
      console.log(`Admin user with email ${email} already exists → skip`);
      return;
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const admin = adminRepo.create({
      email,
      passwordHash: hashedPassword,
      fullName: 'System Administrator',
      isActive: true,
    });

    await adminRepo.save(admin);

    console.log(`Admin user created successfully: ${email}`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const email = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || '';

    if (!email) return;

    const adminRepo = queryRunner.manager.getRepository(AdminUser);
    await adminRepo.delete({ email });

    console.log(`Admin user with email ${email} deleted in down migration`);
  }
}

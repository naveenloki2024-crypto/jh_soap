import { connectDatabase, disconnectDatabase } from '../config/database.js';
import env from '../config/env.js';
import Admin from '../models/Admin.js';
import { hashPassword } from '../lib/password.js';
import { safeErrorMessage } from '../lib/safe-log.js';
import { EMAIL_RE } from '../lib/validation.js';

async function seedAdmin() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env before running this script.');
  }
  if (!EMAIL_RE.test(env.ADMIN_EMAIL)) throw new Error('ADMIN_EMAIL is not a valid email address.');
  if (env.ADMIN_PASSWORD.length < 12) {
    throw new Error('ADMIN_PASSWORD must be at least 12 characters long.');
  }
  if (!['admin', 'super_admin'].includes(env.ADMIN_ROLE)) {
    throw new Error('ADMIN_ROLE must be either "admin" or "super_admin".');
  }

  const resetPassword = process.argv.includes('--reset-password');
  const email = env.ADMIN_EMAIL.toLowerCase();

  await connectDatabase();
  const existing = await Admin.findOne({ email });
  if (existing) {
    if (!resetPassword) {
      console.log(
        `Admin already exists for ${existing.email} (role: ${existing.role}, active: ${existing.isActive}). No changes made.`,
      );
      console.log('Run with --reset-password to sync this account with ADMIN_PASSWORD.');
      return;
    }

    existing.name = existing.name || 'JH Soaps Admin';
    existing.passwordHash = await hashPassword(env.ADMIN_PASSWORD);
    existing.role = env.ADMIN_ROLE;
    existing.isActive = true;
    await existing.save();
    console.log(`Admin password and role updated for ${existing.email}. No duplicate created.`);
    return;
  }

  await Admin.create({
    name: 'JH Soaps Admin',
    email,
    passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    role: env.ADMIN_ROLE,
  });
  console.log(`Admin created for ${email}.`);
}

seedAdmin()
  .catch((error) => {
    console.error(`Admin seed failed: ${safeErrorMessage(error)}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase().catch(() => {});
  });

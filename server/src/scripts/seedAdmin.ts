import '../config/env.js';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

const run = async () => {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env before seeding.');
    process.exit(1);
  }

  await connectDB();

 const existing = await User.findOne({ email }).select('+passwordHash');
if (existing) {
  const passwordHash = await bcrypt.hash(password, 12);
  existing.passwordHash = passwordHash;
  await existing.save();
  console.log(`✅ Admin "${email}" already existed — password updated to the one in .env.`);
  await mongoose.disconnect();
  return;
}

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name: 'Admin', email, passwordHash, role: 'admin' });

  console.log(`✅ Admin account created: ${email}`);
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});

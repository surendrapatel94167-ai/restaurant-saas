import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Tenant from '../models/Tenant.model.js';
import User from '../models/User.model.js';
import { hashPassword } from '../modules/auth/auth.service.js';

async function seed() {
  await connectDB();

  const superAdminExists = await mongoose.connection.collection('users').findOne({ role: 'super_admin' });
  if (!superAdminExists) {
    await mongoose.connection.collection('users').insertOne({
      name: 'Company Super Admin',
      email: 'superadmin@yourcompany.com',
      passwordHash: await hashPassword('ChangeMe123!'),
      role: 'super_admin',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('[seed] super_admin created — superadmin@yourcompany.com / ChangeMe123!');
  }

  let tenant = await Tenant.findOne({ slug: 'demo-hotel' });
  if (!tenant) {
    tenant = await Tenant.create({
      hotelName: 'Demo Hotel',
      slug: 'demo-hotel',
      contactEmail: 'demo@hotel.com',
      isActive: true,
    });
    console.log('[seed] demo tenant created:', tenant.slug);
  }

  const adminExists = await User.findOne({ email: 'admin@demohotel.com', tenantId: tenant._id });
  if (!adminExists) {
    await User.create({
      tenantId: tenant._id,
      name: 'Demo Hotel Admin',
      email: 'admin@demohotel.com',
      passwordHash: await hashPassword('ChangeMe123!'),
      role: 'hotel_admin',
    });
    console.log('[seed] hotel_admin created — admin@demohotel.com / ChangeMe123!');
  }

  console.log('[seed] Done.');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

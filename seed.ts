import { db } from './src/lib/db';
import bcrypt from 'bcryptjs';

async function seed() {
  const adminPass = await bcrypt.hash('admin123', 12);
  const ptPass = await bcrypt.hash('paytaker123', 12);

  const admin = await db.user.upsert({
    where: { email: 'admin@gigsolutions.com' },
    update: {},
    create: { email: 'admin@gigsolutions.com', password: adminPass, name: 'Marcus Johnson', role: 'admin', isActive: true, accountStatus: 'active' },
  });
  console.log('Admin:', admin.email);

  const pt = await db.user.upsert({
    where: { email: 'payments@gigsolutions.com' },
    update: {},
    create: { email: 'payments@gigsolutions.com', password: ptPass, name: 'Payment Team', role: 'payment_taker', isActive: true, accountStatus: 'active' },
  });
  console.log('Payment Taker:', pt.email);

  await db.$disconnect();
}

seed().catch(console.error);

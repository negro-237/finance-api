import 'dotenv/config';

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../generated/prisma/client.js';

import { seedUser } from './seeders/user.seeder.js';
import { seedCategories } from './seeders/category.seeder.js';
import { seedFinance } from './seeders/finance.seeder.js';

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST!,
  port: Number(process.env.DATABASE_PORT!),
  user: process.env.DATABASE_USER!,
  password: process.env.DATABASE_PASSWORD!,
  database: process.env.DATABASE_NAME!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Database seed is only allowed in development mode.');
  }
  console.log('🌱 Starting database seed...');

  await prisma.$transaction([
    prisma.emailVerification.deleteMany(),
    prisma.transfer.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.budget.deleteMany(),
    prisma.account.deleteMany(),
    prisma.category.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  /*
   * USER
   */
  const user = await seedUser(prisma);

  console.log(`👤 User: ${user.email}`);

  /*
   * CATEGORIES
   */
  const categories = await seedCategories(prisma, user.id);

  console.log(`🏷️ Categories: ${categories.length}`);

  /*
   * FINANCE
   */
  await seedFinance(prisma, user.id, categories);

  console.log('💰 Finance data created');

  console.log('✅ Database seed completed!');
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

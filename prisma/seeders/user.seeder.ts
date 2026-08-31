import { PrismaClient } from '../../generated/prisma/client.js';

import { createUser } from '../factories/user.factory.js';

export async function seedUser(prisma: PrismaClient) {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: 'demo@finance.com',
    },
  });

  if (existingUser) {
    return existingUser;
  }

  return createUser(prisma, {
    email: 'demo@finance.com',
    password: 'Password123!',
    firstName: 'Demo',
    lastName: 'User',
    emailVerified: true,
  });
}

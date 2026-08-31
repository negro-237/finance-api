import * as bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';

import { PrismaClient } from '../../generated/prisma/client.js';

export async function createUser(
  prisma: PrismaClient,
  data?: {
    email?: string;
    password?: string;
    firstName?: string;
    lastName?: string;
    emailVerified?: boolean;
  },
) {
  const password = await bcrypt.hash(data?.password ?? 'Password123!', 12);

  return prisma.user.create({
    data: {
      email: data?.email ?? faker.internet.email(),

      password,

      firstName: data?.firstName ?? faker.person.firstName(),

      lastName: data?.lastName ?? faker.person.lastName(),

      emailVerified: data?.emailVerified ?? true,
    },
  });
}

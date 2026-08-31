import { faker } from '@faker-js/faker';

import {
  AccountType,
  Prisma,
  PrismaClient,
} from '../../generated/prisma/client.js';

export async function createAccount(
  prisma: PrismaClient,
  userId: number,
  data?: {
    name?: string;
    type?: AccountType;
    balance?: number;
    currency?: string;
  },
) {
  return prisma.account.create({
    data: {
      userId,

      name: data?.name ?? faker.finance.accountName(),

      type:
        data?.type ?? faker.helpers.arrayElement(Object.values(AccountType)),

      balance: new Prisma.Decimal(
        data?.balance ??
          faker.number.float({
            min: 100,
            max: 10000,
            fractionDigits: 2,
          }),
      ),

      currency: data?.currency ?? 'CAD',

      isActive: true,
    },
  });
}

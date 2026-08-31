import { faker } from '@faker-js/faker';

import {
  Prisma,
  PrismaClient,
  TransactionType,
} from '../../generated/prisma/client.js';

export async function createTransaction(
  prisma: PrismaClient,
  userId: number,
  accountId: number,
  categoryId: number,
  type: TransactionType,
  data?: {
    amount?: number;
    description?: string;
    date?: Date;
  },
) {
  return prisma.transaction.create({
    data: {
      userId,

      accountId,

      categoryId,

      type,

      amount: new Prisma.Decimal(
        data?.amount ??
          faker.number.float({
            min: 10,
            max: 500,
            fractionDigits: 2,
          }),
      ),

      description: data?.description ?? faker.commerce.productName(),

      date:
        data?.date ??
        faker.date.recent({
          days: 30,
        }),
    },
  });
}

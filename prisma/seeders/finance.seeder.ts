import {
  Prisma,
  PrismaClient,
  TransactionType,
} from '../../generated/prisma/client.js';

import { createAccount } from '../factories/account.factory.js';
import { createTransaction } from '../factories/transaction.factory.js';

export async function seedFinance(
  prisma: PrismaClient,
  userId: number,
  categories: any[],
) {
  /*
   * ========================================
   * ACCOUNTS
   * ========================================
   */

  const checkingAccount = await createAccount(prisma, userId, {
    name: 'Compte courant',
    type: 'BANK',
    balance: 3500,
    currency: 'CAD',
  });

  const savingsAccount = await createAccount(prisma, userId, {
    name: 'Épargne',
    type: 'SAVINGS',
    balance: 7500,
    currency: 'CAD',
  });

  const creditCard = await createAccount(prisma, userId, {
    name: 'Carte de crédit',
    type: 'CREDIT_CARD',
    balance: -450,
    currency: 'CAD',
  });

  /*
   * ========================================
   * CATEGORIES
   * ========================================
   */

  const salaryCategory = categories.find(
    (category) => category.name === 'Salaire',
  );

  const foodCategory = categories.find(
    (category) => category.name === 'Alimentation',
  );

  const transportCategory = categories.find(
    (category) => category.name === 'Transport',
  );

  const housingCategory = categories.find(
    (category) => category.name === 'Logement',
  );

  const leisureCategory = categories.find(
    (category) => category.name === 'Loisirs',
  );

  const shoppingCategory = categories.find(
    (category) => category.name === 'Shopping',
  );

  /*
   * ========================================
   * TRANSACTIONS
   * ========================================
   */

  await createTransaction(
    prisma,
    userId,
    checkingAccount.id,
    salaryCategory.id,
    TransactionType.INCOME,
    {
      amount: 3500,
      description: 'Salaire mensuel',
      date: new Date(),
    },
  );

  await createTransaction(
    prisma,
    userId,
    checkingAccount.id,
    foodCategory.id,
    TransactionType.EXPENSE,
    {
      amount: 125.5,
      description: 'Courses alimentaires',
      date: new Date(),
    },
  );

  await createTransaction(
    prisma,
    userId,
    checkingAccount.id,
    transportCategory.id,
    TransactionType.EXPENSE,
    {
      amount: 75,
      description: 'Transport',
      date: new Date(),
    },
  );

  await createTransaction(
    prisma,
    userId,
    checkingAccount.id,
    housingCategory.id,
    TransactionType.EXPENSE,
    {
      amount: 1200,
      description: 'Loyer',
      date: new Date(),
    },
  );

  await createTransaction(
    prisma,
    userId,
    creditCard.id,
    leisureCategory.id,
    TransactionType.EXPENSE,
    {
      amount: 85.99,
      description: 'Cinéma',
      date: new Date(),
    },
  );

  await createTransaction(
    prisma,
    userId,
    creditCard.id,
    shoppingCategory.id,
    TransactionType.EXPENSE,
    {
      amount: 249.99,
      description: 'Achat électronique',
      date: new Date(),
    },
  );

  /*
   * ========================================
   * TRANSFER
   * ========================================
   */

  await prisma.transfer.create({
    data: {
      userId,

      sourceAccountId: checkingAccount.id,

      destinationAccountId: savingsAccount.id,

      amount: new Prisma.Decimal('500.00'),

      description: 'Épargne mensuelle',

      date: new Date(),
    },
  });

  return {
    checkingAccount,
    savingsAccount,
    creditCard,
  };
}

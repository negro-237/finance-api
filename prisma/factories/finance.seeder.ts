import {
  AccountType,
  PrismaClient,
  TransactionType,
} from '../../generated/prisma/client.js';

export async function seedFinance(
  prisma: PrismaClient,
  userId: number,
  categories: Awaited<ReturnType<typeof prisma.category.findMany>>,
) {
  /*
   * ==========================================
   * 1. ACCOUNTS
   * ==========================================
   */

  const checking = await prisma.account.upsert({
    where: {
      id: -1,
    },
    update: {},
    create: {
      userId,
      name: 'Compte courant',
      type: AccountType.BANK,
      balance: 0,
      currency: 'CAD',
      description: 'Compte bancaire principal',
      isActive: true,
    },
  });

  const savings = await prisma.account.create({
    data: {
      userId,
      name: 'Épargne',
      type: AccountType.SAVINGS,
      balance: 0,
      currency: 'CAD',
      description: 'Compte épargne',
      isActive: true,
    },
  });

  const cash = await prisma.account.create({
    data: {
      userId,
      name: 'Espèces',
      type: AccountType.CASH,
      balance: 0,
      currency: 'CAD',
      description: 'Argent liquide',
      isActive: true,
    },
  });

  /*
   * ==========================================
   * 2. CATEGORIES
   * ==========================================
   */

  const getCategory = (name: string) => {
    const category = categories.find((item) => item.name === name);

    if (!category) {
      throw new Error(`Category "${name}" not found`);
    }

    return category;
  };

  const salary = getCategory('Salaire');
  const freelance = getCategory('Freelance');
  const food = getCategory('Alimentation');
  const transport = getCategory('Transport');
  const housing = getCategory('Logement');
  const leisure = getCategory('Loisirs');
  const health = getCategory('Santé');
  const shopping = getCategory('Shopping');

  /*
   * ==========================================
   * 3. TRANSACTIONS
   * ==========================================
   */

  const transactions = [
    {
      amount: 3500,
      type: TransactionType.INCOME,
      description: 'Salaire',
      date: new Date(2026, 7, 1),
      accountId: checking.id,
      categoryId: salary.id,
    },
    {
      amount: 750,
      type: TransactionType.INCOME,
      description: 'Mission freelance',
      date: new Date(2026, 7, 5),
      accountId: checking.id,
      categoryId: freelance.id,
    },

    {
      amount: 650,
      type: TransactionType.EXPENSE,
      description: 'Loyer',
      date: new Date(2026, 7, 2),
      accountId: checking.id,
      categoryId: housing.id,
    },
    {
      amount: 420,
      type: TransactionType.EXPENSE,
      description: 'Courses alimentaires',
      date: new Date(2026, 7, 4),
      accountId: checking.id,
      categoryId: food.id,
    },
    {
      amount: 120,
      type: TransactionType.EXPENSE,
      description: 'Transport',
      date: new Date(2026, 7, 7),
      accountId: checking.id,
      categoryId: transport.id,
    },
    {
      amount: 85,
      type: TransactionType.EXPENSE,
      description: 'Restaurant',
      date: new Date(2026, 7, 10),
      accountId: checking.id,
      categoryId: food.id,
    },
    {
      amount: 150,
      type: TransactionType.EXPENSE,
      description: 'Loisirs',
      date: new Date(2026, 7, 12),
      accountId: checking.id,
      categoryId: leisure.id,
    },
    {
      amount: 95,
      type: TransactionType.EXPENSE,
      description: 'Pharmacie',
      date: new Date(2026, 7, 15),
      accountId: checking.id,
      categoryId: health.id,
    },
    {
      amount: 180,
      type: TransactionType.EXPENSE,
      description: 'Shopping',
      date: new Date(2026, 7, 18),
      accountId: checking.id,
      categoryId: shopping.id,
    },
  ];

  for (const transaction of transactions) {
    await prisma.transaction.create({
      data: {
        userId,
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description,
        date: transaction.date,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
      },
    });
  }

  /*
   * ==========================================
   * 4. TRANSFER
   * ==========================================
   */

  await prisma.transfer.create({
    data: {
      userId,
      sourceAccountId: checking.id,
      destinationAccountId: savings.id,
      amount: 1000,
      description: 'Épargne mensuelle',
      date: new Date(2026, 7, 20),
    },
  });

  /*
   * ==========================================
   * 5. BUDGETS
   * ==========================================
   */

  await prisma.budget.createMany({
    data: [
      {
        userId,
        categoryId: food.id,
        amount: 600,
        month: 8,
        year: 2026,
      },
      {
        userId,
        categoryId: transport.id,
        amount: 250,
        month: 8,
        year: 2026,
      },
      {
        userId,
        categoryId: leisure.id,
        amount: 300,
        month: 8,
        year: 2026,
      },
      {
        userId,
        categoryId: shopping.id,
        amount: 300,
        month: 8,
        year: 2026,
      },
    ],
    skipDuplicates: true,
  });

  /*
   * ==========================================
   * 6. METTRE À JOUR LES SOLDES
   * ==========================================
   */

  await prisma.account.update({
    where: {
      id: checking.id,
    },
    data: {
      balance: 2135,
    },
  });

  await prisma.account.update({
    where: {
      id: savings.id,
    },
    data: {
      balance: 1000,
    },
  });

  await prisma.account.update({
    where: {
      id: cash.id,
    },
    data: {
      balance: 0,
    },
  });
}

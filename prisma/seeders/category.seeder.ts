import {
  PrismaClient,
  TransactionType,
} from '../../generated/prisma/client.js';

export async function seedCategories(prisma: PrismaClient, userId: number) {
  const categories = [
    {
      name: 'Salaire',
      type: TransactionType.INCOME,
      icon: 'Wallet',
      color: '#22C55E',
    },
    {
      name: 'Freelance',
      type: TransactionType.INCOME,
      icon: 'Briefcase',
      color: '#3B82F6',
    },
    {
      name: 'Alimentation',
      type: TransactionType.EXPENSE,
      icon: 'Utensils',
      color: '#EF4444',
    },
    {
      name: 'Transport',
      type: TransactionType.EXPENSE,
      icon: 'Car',
      color: '#F59E0B',
    },
    {
      name: 'Logement',
      type: TransactionType.EXPENSE,
      icon: 'House',
      color: '#8B5CF6',
    },
    {
      name: 'Loisirs',
      type: TransactionType.EXPENSE,
      icon: 'Gamepad2',
      color: '#EC4899',
    },
    {
      name: 'Santé',
      type: TransactionType.EXPENSE,
      icon: 'HeartPulse',
      color: '#14B8A6',
    },
    {
      name: 'Shopping',
      type: TransactionType.EXPENSE,
      icon: 'ShoppingBag',
      color: '#6366F1',
    },
  ];

  type Category = NonNullable<
    Awaited<ReturnType<typeof prisma.category.findFirst>>
  >;

  const result: Category[] = [];

  for (const category of categories) {
    const existing = await prisma.category.findFirst({
      where: {
        userId,
        name: category.name,
      },
    });

    if (existing) {
      result.push(existing);
      continue;
    }

    const created = await prisma.category.create({
      data: {
        userId,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        isActive: true,
      },
    });

    result.push(created);
  }

  return result;
}

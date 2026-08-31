import { Injectable } from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma.service.js';

interface MonthlyOverview {
  year: number;
  month: number;
  income: Prisma.Decimal;
  expense: Prisma.Decimal;
  savings: Prisma.Decimal;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(userId: number) {
    const now = new Date();

    /*
     * Premier jour du mois courant
     */
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    /*
     * Premier jour du mois suivant
     */
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    /*
     * 1. Récupérer les comptes
     */
    const accounts = await this.prisma.account.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    /*
     * 2. Calculer le solde total
     */
    const totalBalance = accounts.reduce(
      (total, account) => total.add(account.balance),
      new Prisma.Decimal(0),
    );

    /*
     * 3. Revenus du mois
     */
    const monthlyIncome = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'INCOME',
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    /*
     * 4. Dépenses du mois
     */
    const monthlyExpense = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const income = monthlyIncome._sum.amount ?? new Prisma.Decimal(0);

    const expense = monthlyExpense._sum.amount ?? new Prisma.Decimal(0);

    const savings = income.sub(expense);

    const savingsPercentage = income.gt(0)
      ? savings.div(income).mul(100)
      : new Prisma.Decimal(0);

    /*
     * 5. Dépenses par catégorie
     */
    const expensesByCategory = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: {
        amount: true,
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        month: now.getMonth() + 1,
        year: now.getFullYear(),
      },
      include: {
        category: true,
      },
      orderBy: {
        category: {
          name: 'asc',
        },
      },
    });

    const budgetCategoryIds = budgets.map((budget) => budget.categoryId);

    const budgetExpenses =
      budgetCategoryIds.length > 0
        ? await this.prisma.transaction.groupBy({
            by: ['categoryId'],
            where: {
              userId,
              type: 'EXPENSE',
              categoryId: {
                in: budgetCategoryIds,
              },
              date: {
                gte: startOfMonth,
                lt: startOfNextMonth,
              },
            },
            _sum: {
              amount: true,
            },
          })
        : [];

    const budgetExpenseMap = new Map(
      budgetExpenses.map((item) => [
        item.categoryId,
        item._sum.amount ?? new Prisma.Decimal(0),
      ]),
    );

    const formattedBudgets = budgets.map((budget) => {
      const spent =
        budgetExpenseMap.get(budget.categoryId) ?? new Prisma.Decimal(0);

      const remaining = budget.amount.sub(spent);

      const percentage = budget.amount.gt(0)
        ? spent.div(budget.amount).mul(100)
        : new Prisma.Decimal(0);

      let status = 'ON_TRACK';

      if (percentage.gte(100)) {
        status = 'EXCEEDED';
      } else if (percentage.gte(80)) {
        status = 'WARNING';
      }

      return {
        id: budget.id,
        categoryId: budget.categoryId,
        categoryName: budget.category.name,
        icon: budget.category.icon,
        color: budget.category.color,

        budget: this.decimalToNumber(budget.amount),
        spent: this.decimalToNumber(spent),
        remaining: this.decimalToNumber(remaining),
        percentage: this.decimalToNumber(percentage),

        status,
      };
    });

    /*
     * Récupérer les informations des catégories
     */
    const categoryIds = expensesByCategory.map((item) => item.categoryId);

    const categories = await this.prisma.category.findMany({
      where: {
        id: {
          in: categoryIds,
        },
      },
    });

    const categoryMap = new Map(
      categories.map((category) => [category.id, category]),
    );

    const formattedExpensesByCategory = expensesByCategory.map((item) => {
      const category = categoryMap.get(item.categoryId);

      return {
        categoryId: item.categoryId,
        categoryName: category?.name ?? 'Unknown',
        icon: category?.icon ?? null,
        color: category?.color ?? null,
        amount: item._sum.amount ?? new Prisma.Decimal(0),
      };
    });

    /*
     * 6. Dernières transactions
     */
    const recentTransactions = await this.prisma.transaction.findMany({
      where: {
        userId,
      },
      include: {
        account: true,
        category: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 10,
    });

    /*
     * 7. Evolution des 6 derniers mois
     */
    const monthlyOverview = await this.getMonthlyOverview(userId);

    /*
     * 8. Retourner le Dashboard
     */
    return {
      summary: {
        totalBalance: this.decimalToNumber(totalBalance),
        monthlyIncome: this.decimalToNumber(income),
        monthlyExpense: this.decimalToNumber(expense),
        monthlySavings: this.decimalToNumber(savings),
        monthlySavingsPercentage: this.decimalToNumber(savingsPercentage),
      },

      accounts: accounts.map((account) => ({
        ...account,
        balance: this.decimalToNumber(account.balance),
      })),

      expensesByCategory: formattedExpensesByCategory.map((item) => ({
        ...item,
        amount: this.decimalToNumber(item.amount),
      })),

      budgets: formattedBudgets,

      monthlyOverview: monthlyOverview.map((month) => ({
        ...month,
        income: this.decimalToNumber(month.income),
        expense: this.decimalToNumber(month.expense),
        savings: this.decimalToNumber(month.savings),
      })),

      recentTransactions: recentTransactions.map((transaction) => ({
        ...transaction,
        amount: this.decimalToNumber(transaction.amount),
      })),
    };
  }

  private async getMonthlyOverview(userId: number): Promise<MonthlyOverview[]> {
    const months: MonthlyOverview[] = [];

    const now = new Date();

    /*
     * Les 6 derniers mois
     */
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);

      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

      const [income, expense] = await Promise.all([
        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'INCOME',
            date: {
              gte: start,
              lt: end,
            },
          },
          _sum: {
            amount: true,
          },
        }),

        this.prisma.transaction.aggregate({
          where: {
            userId,
            type: 'EXPENSE',
            date: {
              gte: start,
              lt: end,
            },
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      const monthlyIncome = income._sum.amount ?? new Prisma.Decimal(0);

      const monthlyExpense = expense._sum.amount ?? new Prisma.Decimal(0);

      months.push({
        year: start.getFullYear(),
        month: start.getMonth() + 1,

        income: monthlyIncome,
        expense: monthlyExpense,

        savings: monthlyIncome.sub(monthlyExpense),
      });
    }

    return months;
  }

  private decimalToNumber(value: Prisma.Decimal): number {
    return Number(value.toString());
  }
}

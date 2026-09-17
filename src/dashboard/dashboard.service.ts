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
     * ============================================================
     * 1. RÉCUPÉRER LES COMPTES
     * ============================================================
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
     * ============================================================
     * 2. CALCULER LE SOLDE TOTAL
     * ============================================================
     */

    const totalBalance = accounts.reduce(
      (total, account) => total.add(account.balance),
      new Prisma.Decimal(0),
    );

    /*
     * ============================================================
     * 3. REVENUS DU MOIS
     * ============================================================
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
     * ============================================================
     * 4. DÉPENSES DU MOIS
     * ============================================================
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
     * ============================================================
     * 5. DÉPENSES PAR CATÉGORIE
     * ============================================================
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

    /*
     * ============================================================
     * 6. BUDGETS DU MOIS
     * ============================================================
     */

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
     * ============================================================
     * 7. INFORMATIONS DES CATÉGORIES
     * ============================================================
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
     * ============================================================
     * 8. DERNIÈRES TRANSACTIONS
     * ============================================================
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
     * ============================================================
     * 9. DERNIERS VIREMENTS
     * ============================================================
     *
     * IMPORTANT :
     * Les virements sont récupérés depuis la table Transfer.
     *
     * Ils ne sont donc PAS considérés comme des revenus
     * ou des dépenses.
     */

    const recentTransfers = await this.prisma.transfer.findMany({
      where: {
        userId,
      },
      include: {
        sourceAccount: true,
        destinationAccount: true,
      },
      orderBy: {
        date: 'desc',
      },
      take: 5,
    });

    /*
     * ============================================================
     * 10. ÉVOLUTION DES 6 DERNIERS MOIS
     * ============================================================
     */

    const monthlyOverview = await this.getMonthlyOverview(userId);

    /*
     * ============================================================
     * 11. RETOURNER LE DASHBOARD
     * ============================================================
     */

    return {
      summary: {
        totalBalance: this.decimalToNumber(totalBalance),

        monthlyIncome: this.decimalToNumber(income),

        monthlyExpense: this.decimalToNumber(expense),

        monthlySavings: this.decimalToNumber(savings),

        monthlySavingsPercentage: this.decimalToNumber(savingsPercentage),
      },

      /*
       * ----------------------------------------------------------
       * COMPTES
       * ----------------------------------------------------------
       */

      accounts: accounts.map((account) => ({
        ...account,
        balance: this.decimalToNumber(account.balance),
      })),

      /*
       * ----------------------------------------------------------
       * DÉPENSES PAR CATÉGORIE
       * ----------------------------------------------------------
       */

      expensesByCategory: formattedExpensesByCategory.map((item) => ({
        ...item,
        amount: this.decimalToNumber(item.amount),
      })),

      /*
       * ----------------------------------------------------------
       * BUDGETS
       * ----------------------------------------------------------
       */

      budgets: formattedBudgets,

      /*
       * ----------------------------------------------------------
       * ÉVOLUTION MENSUELLE
       * ----------------------------------------------------------
       */

      monthlyOverview: monthlyOverview.map((month) => ({
        ...month,

        income: this.decimalToNumber(month.income),

        expense: this.decimalToNumber(month.expense),

        savings: this.decimalToNumber(month.savings),
      })),

      /*
       * ----------------------------------------------------------
       * TRANSACTIONS RÉCENTES
       * ----------------------------------------------------------
       */

      recentTransactions: recentTransactions.map((transaction) => ({
        ...transaction,

        amount: this.decimalToNumber(transaction.amount),
      })),

      /*
       * ----------------------------------------------------------
       * VIREMENTS RÉCENTS
       * ----------------------------------------------------------
       */

      recentTransfers: recentTransfers.map((transfer) => ({
        ...transfer,

        amount: this.decimalToNumber(transfer.amount),

        sourceAccount: {
          ...transfer.sourceAccount,

          balance: this.decimalToNumber(transfer.sourceAccount.balance),
        },

        destinationAccount: {
          ...transfer.destinationAccount,

          balance: this.decimalToNumber(transfer.destinationAccount.balance),
        },
      })),
    };
  }

  /*
   * ============================================================
   * ÉVOLUTION DES 6 DERNIERS MOIS
   * ============================================================
   */

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

  /*
   * ============================================================
   * DECIMAL -> NUMBER
   * ============================================================
   */

  private decimalToNumber(value: Prisma.Decimal): number {
    return Number(value.toString());
  }
}

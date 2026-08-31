import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';

@Injectable()
export class BudgetService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Créer un budget
   */
  async create(userId: number, dto: CreateBudgetDto) {
    console.log('id', userId);
    // Vérifier que la catégorie appartient à l'utilisateur
    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        userId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    // Vérifier qu'un budget n'existe pas déjà
    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId,
        month: dto.month,
        year: dto.year,
      },
    });

    if (existingBudget) {
      throw new ConflictException(
        'A budget already exists for this category and period.',
      );
    }

    return this.prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        month: dto.month,
        year: dto.year,
      },
      include: {
        category: true,
      },
    });
  }

  /**
   * Récupérer tous les budgets de l'utilisateur
   */
  async findAll(userId: number, month?: number, year?: number) {
    return this.prisma.budget.findMany({
      where: {
        userId,

        ...(month !== undefined && {
          month,
        }),

        ...(year !== undefined && {
          year,
        }),
      },

      include: {
        category: true,
      },

      orderBy: [
        {
          year: 'desc',
        },
        {
          month: 'desc',
        },
        {
          category: {
            name: 'asc',
          },
        },
      ],
    });
  }

  /**
   * Récupérer un budget
   */
  async findOne(userId: number, id: number) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        category: true,
      },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found.');
    }

    return budget;
  }

  /**
   * Modifier un budget
   */
  async update(userId: number, id: number, dto: UpdateBudgetDto) {
    const budget = await this.findOne(userId, id);

    const month = dto.month ?? budget.month;
    const year = dto.year ?? budget.year;

    // Vérifier qu'on ne crée pas un doublon
    const duplicate = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: budget.categoryId,
        month,
        year,
        NOT: {
          id,
        },
      },
    });

    if (duplicate) {
      throw new ConflictException(
        'A budget already exists for this category and period.',
      );
    }

    return this.prisma.budget.update({
      where: {
        id,
      },

      data: {
        ...(dto.amount !== undefined && {
          amount: dto.amount,
        }),

        ...(dto.month !== undefined && {
          month: dto.month,
        }),

        ...(dto.year !== undefined && {
          year: dto.year,
        }),
      },

      include: {
        category: true,
      },
    });
  }

  /**
   * Supprimer un budget
   */
  async remove(userId: number, id: number) {
    await this.findOne(userId, id);

    await this.prisma.budget.delete({
      where: {
        id,
      },
    });

    return {
      message: 'Budget deleted successfully.',
    };
  }

  async getSummary(userId: number, month: number, year: number) {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        month,
        year,
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

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 1);

    const expenses = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const expenseMap = new Map(
      expenses.map((expense) => [
        expense.categoryId,
        expense._sum?.amount ?? 0,
      ]),
    );

    return budgets.map((budget) => {
      const budgetAmount = Number(budget.amount);

      const spent = Number(expenseMap.get(budget.categoryId) ?? 0);

      const remaining = budgetAmount - spent;

      const percentage =
        budgetAmount > 0
          ? Number(((spent / budgetAmount) * 100).toFixed(2))
          : 0;

      let status: 'ON_TRACK' | 'WARNING' | 'EXCEEDED';

      if (percentage >= 100) {
        status = 'EXCEEDED';
      } else if (percentage >= 80) {
        status = 'WARNING';
      } else {
        status = 'ON_TRACK';
      }

      return {
        id: budget.id,

        category: {
          id: budget.category.id,
          name: budget.category.name,
          icon: budget.category.icon,
          color: budget.category.color,
        },

        budget: budgetAmount,
        spent,
        remaining,
        percentage,
        status,

        month,
        year,
      };
    });
  }
}

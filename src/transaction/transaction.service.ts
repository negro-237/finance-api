import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { AccountType, Prisma } from '../../generated/prisma/client.js';

import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateTransactionDto) {
    if (dto.type === 'TRANSFER') {
      throw new BadRequestException(
        'Transfers must be created using the transfer endpoint.',
      );
    }

    if (dto.amount <= 0) {
      throw new BadRequestException(
        'Transaction amount must be greater than zero.',
      );
    }
    const account = await this.prisma.account.findFirst({
      where: {
        id: dto.accountId,
        userId,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    if (dto.type === 'EXPENSE' && account.type !== AccountType.CREDIT_CARD) {
      const amount = new Prisma.Decimal(dto.amount);

      if (account.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient account balance.');
      }
    }

    const category = await this.prisma.category.findFirst({
      where: {
        id: dto.categoryId,
        OR: [
          {
            userId: null,
          },
          {
            userId,
          },
        ],
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    if (category.type !== dto.type) {
      throw new BadRequestException(
        'Transaction type does not match category type.',
      );
    }

    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          amount,
          type: dto.type,
          description: dto.description,
          date: dto.date ? new Date(dto.date) : new Date(),

          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
        },
      });

      const balanceChange = dto.type === 'INCOME' ? amount : amount.negated();

      await tx.account.update({
        where: {
          id: dto.accountId,
        },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      return transaction;
    });
  }

  async findAll(userId: number) {
    return this.prisma.transaction.findMany({
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
    });
  }

  async findOne(userId: number, transactionId: number) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
      include: {
        account: true,
        category: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found.');
    }

    return transaction;
  }

  async update(
    userId: number,
    transactionId: number,
    dto: UpdateTransactionDto,
  ) {
    /*
     * 1. Vérifier que la transaction existe
     *    et appartient bien à l'utilisateur.
     */
    const existing = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId,
      },
    });

    if (!existing) {
      throw new NotFoundException('Transaction not found.');
    }

    /*
     * Le compte ne peut pas être changé
     * dans le MVP.
     */
    const account = await this.prisma.account.findFirst({
      where: {
        id: existing.accountId,
        userId,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found.');
    }

    /*
     * 2. Déterminer les nouvelles valeurs.
     */
    const newAmount =
      dto.amount !== undefined
        ? new Prisma.Decimal(dto.amount)
        : existing.amount;

    const newType = dto.type ?? existing.type;

    const newCategoryId = dto.categoryId ?? existing.categoryId;

    /*
     * 3. Vérifier la catégorie.
     *
     * Une catégorie peut être :
     * - globale : userId = null
     * - personnelle : userId = utilisateur connecté
     */
    const category = await this.prisma.category.findFirst({
      where: {
        id: newCategoryId,
        OR: [
          {
            userId: null,
          },
          {
            userId,
          },
        ],
        isActive: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    /*
     * 4. Vérifier que le type de catégorie
     * correspond au type de transaction.
     *
     * Exemple :
     *
     * Category = Food / EXPENSE
     * Transaction = INCOME
     *
     * => interdit
     */
    if (category.type !== newType) {
      throw new BadRequestException(
        'Transaction type does not match category type.',
      );
    }

    /*
     * 5. Transaction Prisma atomique.
     *
     * Toutes les opérations ci-dessous
     * seront validées ou annulées ensemble.
     */
    return this.prisma.$transaction(async (tx) => {
      /*
       * 6. Récupérer le compte à l'intérieur
       * de la transaction.
       */
      const currentAccount = await tx.account.findUnique({
        where: {
          id: existing.accountId,
        },
      });

      if (!currentAccount) {
        throw new NotFoundException('Account not found.');
      }

      /*
       * 7. Calculer le solde après avoir
       * annulé l'ancienne transaction.
       *
       * Ancienne transaction :
       *
       * INCOME 100
       * => il faut retirer 100
       *
       * EXPENSE 100
       * => il faut remettre 100
       */
      const balanceAfterRevert =
        existing.type === 'INCOME'
          ? currentAccount.balance.sub(existing.amount)
          : currentAccount.balance.add(existing.amount);

      /*
       * 8. Vérifier le nouveau solde.
       *
       * Une carte de crédit peut avoir
       * un solde négatif.
       */
      if (
        newType === 'EXPENSE' &&
        currentAccount.type !== AccountType.CREDIT_CARD &&
        balanceAfterRevert.lessThan(newAmount)
      ) {
        throw new BadRequestException('Insufficient account balance.');
      }

      /*
       * 9. Calculer l'effet de la nouvelle
       * transaction.
       */
      const newBalance =
        newType === 'INCOME'
          ? balanceAfterRevert.add(newAmount)
          : balanceAfterRevert.sub(newAmount);

      /*
       * 10. Mettre à jour le compte.
       */
      await tx.account.update({
        where: {
          id: existing.accountId,
        },
        data: {
          balance: newBalance,
        },
      });

      /*
       * 11. Mettre à jour la transaction.
       */
      const transaction = await tx.transaction.update({
        where: {
          id: transactionId,
        },
        data: {
          amount: newAmount,
          type: newType,
          categoryId: newCategoryId,

          description:
            dto.description !== undefined
              ? dto.description
              : existing.description,

          date: dto.date !== undefined ? new Date(dto.date) : existing.date,
        },
        include: {
          account: true,
          category: true,
        },
      });

      return transaction;
    });
  }

  async remove(userId: number, transactionId: number) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({
        where: {
          id: transactionId,
          userId,
        },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found.');
      }

      const account = await tx.account.findFirst({
        where: {
          id: transaction.accountId,
          userId,
        },
      });

      if (!account) {
        throw new NotFoundException('Account not found.');
      }

      /*
       * Annuler l'effet de la transaction.
       *
       * INCOME 100
       * => -100
       *
       * EXPENSE 100
       * => +100
       */
      const balanceChange =
        transaction.type === 'INCOME'
          ? transaction.amount.negated()
          : transaction.amount;

      await tx.account.update({
        where: {
          id: account.id,
        },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      await tx.transaction.delete({
        where: {
          id: transaction.id,
        },
      });

      return {
        message: 'Transaction deleted successfully.',
      };
    });
  }
}

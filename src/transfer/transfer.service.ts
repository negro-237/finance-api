import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '../../generated/prisma/client.js';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateTransferDto } from './dto/create-transfer.dto.js';

@Injectable()
export class TransferService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateTransferDto) {
    if (dto.sourceAccountId === dto.destinationAccountId) {
      throw new BadRequestException(
        'Source and destination accounts must be different.',
      );
    }

    const amount = new Prisma.Decimal(dto.amount);

    return this.prisma.$transaction(async (tx) => {
      /*
       * Récupérer le compte source
       */
      const sourceAccount = await tx.account.findFirst({
        where: {
          id: dto.sourceAccountId,
          userId,
          isActive: true,
        },
      });

      if (!sourceAccount) {
        throw new NotFoundException('Source account not found.');
      }

      /*
       * Récupérer le compte destination
       */
      const destinationAccount = await tx.account.findFirst({
        where: {
          id: dto.destinationAccountId,
          userId,
          isActive: true,
        },
      });

      if (!destinationAccount) {
        throw new NotFoundException('Destination account not found.');
      }

      /*
       * Vérifier le solde du compte source.
       *
       * Même une carte de crédit peut avoir
       * un solde négatif, mais on ne peut pas
       * transférer de l'argent qu'on ne possède
       * pas dans notre modèle actuel.
       */
      if (sourceAccount.balance.lessThan(amount)) {
        throw new BadRequestException('Insufficient account balance.');
      }

      /*
       * Nouveau solde source
       */
      const newSourceBalance = sourceAccount.balance.sub(amount);

      /*
       * Nouveau solde destination
       */
      const newDestinationBalance = destinationAccount.balance.add(amount);

      /*
       * Débiter le compte source
       */
      await tx.account.update({
        where: {
          id: sourceAccount.id,
        },
        data: {
          balance: newSourceBalance,
        },
      });

      /*
       * Créditer le compte destination
       */
      await tx.account.update({
        where: {
          id: destinationAccount.id,
        },
        data: {
          balance: newDestinationBalance,
        },
      });

      /*
       * Créer le transfert
       */
      const transfer = await tx.transfer.create({
        data: {
          userId,

          sourceAccountId: sourceAccount.id,

          destinationAccountId: destinationAccount.id,

          amount,

          description: dto.description ?? null,

          date: dto.date ? new Date(dto.date) : new Date(),
        },

        include: {
          sourceAccount: true,
          destinationAccount: true,
        },
      });

      return transfer;
    });
  }

  async findAll(userId: number) {
    return this.prisma.transfer.findMany({
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
    });
  }

  async findOne(userId: number, transferId: number) {
    const transfer = await this.prisma.transfer.findFirst({
      where: {
        id: transferId,
        userId,
      },

      include: {
        sourceAccount: true,
        destinationAccount: true,
      },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found.');
    }

    return transfer;
  }

  async remove(userId: number, transferId: number) {
    return this.prisma.$transaction(async (tx) => {
      /*
       * Récupérer le transfert
       */
      const transfer = await tx.transfer.findFirst({
        where: {
          id: transferId,
          userId,
        },
      });

      if (!transfer) {
        throw new NotFoundException('Transfer not found.');
      }

      /*
       * Récupérer les comptes
       */
      const sourceAccount = await tx.account.findFirst({
        where: {
          id: transfer.sourceAccountId,
          userId,
        },
      });

      const destinationAccount = await tx.account.findFirst({
        where: {
          id: transfer.destinationAccountId,
          userId,
        },
      });

      if (!sourceAccount || !destinationAccount) {
        throw new NotFoundException('Transfer account not found.');
      }

      /*
       * Annuler l'effet du transfert.
       *
       * Source :
       * + amount
       *
       * Destination :
       * - amount
       */
      const restoredSourceBalance = sourceAccount.balance.add(transfer.amount);

      const restoredDestinationBalance = destinationAccount.balance.sub(
        transfer.amount,
      );

      /*
       * Restaurer le compte source
       */
      await tx.account.update({
        where: {
          id: sourceAccount.id,
        },
        data: {
          balance: restoredSourceBalance,
        },
      });

      /*
       * Restaurer le compte destination
       */
      await tx.account.update({
        where: {
          id: destinationAccount.id,
        },
        data: {
          balance: restoredDestinationBalance,
        },
      });

      /*
       * Supprimer le transfert
       */
      await tx.transfer.delete({
        where: {
          id: transfer.id,
        },
      });

      return {
        message: 'Transfer deleted successfully.',
      };
    });
  }
}

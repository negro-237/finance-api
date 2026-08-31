import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateAccountDto) {
    return this.prisma.account.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        currency: dto.currency ?? 'CAD',
        userId,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.account.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(userId: number, accountId: number) {
    const account = await this.prisma.account.findFirst({
      where: {
        id: accountId,
        userId,
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return account;
  }

  async update(userId: number, accountId: number, dto: UpdateAccountDto) {
    await this.findOne(userId, accountId);

    return this.prisma.account.update({
      where: {
        id: accountId,
      },
      data: dto,
    });
  }

  async remove(userId: number, accountId: number) {
    await this.findOne(userId, accountId);

    await this.prisma.account.delete({
      where: {
        id: accountId,
      },
    });

    return {
      message: 'Account deleted successfully.',
    };
  }
}

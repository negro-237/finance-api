import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { TransactionController } from './transaction.controller.js';
import { TransactionService } from './transaction.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [TransactionController],
  providers: [TransactionService],
})
export class TransactionModule {}

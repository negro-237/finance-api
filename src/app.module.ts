import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AccountModule } from './account/account.module.js';
import { CategoryModule } from './category/category.module.js';
import { TransactionModule } from './transaction/transaction.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { TransferModule } from './transfer/transfer.module.js';
import { BudgetModule } from './budget/budget.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),

    PrismaModule,
    AuthModule,
    AccountModule,
    CategoryModule,
    TransactionModule,
    DashboardModule,
    TransferModule,
    BudgetModule,
  ],
})
export class AppModule {}

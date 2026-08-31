import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService],
})
export class AccountModule {}

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';

import { TransferController } from './transfer.controller.js';
import { TransferService } from './transfer.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [TransferController],
  providers: [TransferService],
})
export class TransferModule {}

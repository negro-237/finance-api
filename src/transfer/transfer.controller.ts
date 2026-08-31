import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import { CreateTransferDto } from './dto/create-transfer.dto.js';

import { TransferService } from './transfer.service.js';

@Controller('transfers')
@UseGuards(JwtAuthGuard)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateTransferDto) {
    return this.transferService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: any) {
    return this.transferService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.transferService.findOne(req.user.userId, id);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.transferService.remove(req.user.userId, id);
  }
}

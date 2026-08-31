import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { BudgetService } from './budget.service.js';
import { CreateBudgetDto } from './dto/create-budget.dto.js';
import { UpdateBudgetDto } from './dto/update-budget.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateBudgetDto) {
    return this.budgetService.create(req.user.userId, dto);
  }

  @Get()
  findAll(
    @Req() req: any,

    @Query(
      'month',
      new ParseIntPipe({
        optional: true,
      }),
    )
    month?: number,

    @Query(
      'year',
      new ParseIntPipe({
        optional: true,
      }),
    )
    year?: number,
  ) {
    return month;
    return this.budgetService.findAll(req.user.userId, month, year);
  }

  @Get('summary')
  getSummary(
    @Req() req: any,

    @Query('month', new ParseIntPipe())
    month: number,

    @Query('year', new ParseIntPipe())
    year: number,
  ) {
    return this.budgetService.getSummary(req.user.userId, month, year);
  }

  @Get(':id')
  findOne(
    @Req() req: any,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.budgetService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,

    @Param('id', ParseIntPipe)
    id: number,

    @Body() dto: UpdateBudgetDto,
  ) {
    return this.budgetService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(
    @Req() req: any,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.budgetService.remove(req.user.userId, id);
  }
}

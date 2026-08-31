import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findFirst({
      where: {
        userId,
        name: dto.name,
        type: dto.type,
      },
    });

    if (existing) {
      throw new ConflictException('A category with this name already exists.');
    }

    return this.prisma.category.create({
      data: {
        name: dto.name,
        type: dto.type,
        icon: dto.icon,
        color: dto.color,
        userId,
      },
    });
  }

  async findAll(userId: number) {
    return this.prisma.category.findMany({
      where: {
        OR: [
          {
            userId: null,
          },
          {
            userId,
          },
        ],
      },
      orderBy: [
        {
          type: 'asc',
        },
        {
          name: 'asc',
        },
      ],
    });
  }

  async findOne(userId: number, categoryId: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        OR: [
          {
            userId: null,
          },
          {
            userId,
          },
        ],
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found.');
    }

    return category;
  }

  async update(userId: number, categoryId: number, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found or cannot be modified.');
    }

    return this.prisma.category.update({
      where: {
        id: categoryId,
      },
      data: dto,
    });
  }

  async remove(userId: number, categoryId: number) {
    const category = await this.prisma.category.findFirst({
      where: {
        id: categoryId,
        userId,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found or cannot be deleted.');
    }

    await this.prisma.category.delete({
      where: {
        id: categoryId,
      },
    });

    return {
      message: 'Category deleted successfully.',
    };
  }
}

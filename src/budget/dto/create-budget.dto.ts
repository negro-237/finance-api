import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class CreateBudgetDto {
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  year: number;
}

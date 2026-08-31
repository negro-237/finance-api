import { IsInt, IsNumber, Max, Min, IsOptional } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number;
}

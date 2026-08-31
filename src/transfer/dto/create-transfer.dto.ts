import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateTransferDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNumber()
  sourceAccountId: number;

  @IsNumber()
  destinationAccountId: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsDateString()
  date?: string;
}

import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AddDebtPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @IsNotEmpty()
  @IsString()
  paymentType!: string; // cash | card | transfer

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateManualDebtDto {
  @IsNotEmpty()
  @Type(() => Number)
  customerId!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  dueDate?: string;
}

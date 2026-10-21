import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export const EXPENSE_PAYMENT_TYPES = ['cash', 'card', 'transfer'];

export class CreateExpenseDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  categoryId!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: "Summa 0 dan katta bo'lishi kerak" })
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsIn(EXPENSE_PAYMENT_TYPES, { message: "To'lov turi noto'g'ri" })
  paymentType?: string;

  // YYYY-MM-DD; berilmasa — bugungi sana
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "Sana YYYY-MM-DD ko'rinishida bo'lishi kerak" })
  expenseDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

import {
  IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Matches, MaxLength, Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DATE_MSG = "Sana YYYY-MM-DD ko'rinishida bo'lishi kerak";
export const FINANCE_PAYMENT_TYPES = ['cash', 'card', 'transfer'];

export class CreateSupplierDto {
  @IsNotEmpty({ message: 'Yetkazib beruvchi nomi kerak' })
  @IsString()
  @MaxLength(150)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateSupplierDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateSupplierDebtDto {
  @IsNotEmpty()
  @IsInt()
  @Type(() => Number)
  supplierId!: number;

  // Xaridning to'liq summasi
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01, { message: "Summa 0 dan katta bo'lishi kerak" })
  @Type(() => Number)
  amount!: number;

  // Xarid paytida darhol to'langan qismi (qolgani qarz bo'ladi)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paidAmount?: number;

  @IsOptional()
  @IsIn(FINANCE_PAYMENT_TYPES, { message: "To'lov turi noto'g'ri" })
  paymentType?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: DATE_MSG })
  debtDate?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: DATE_MSG })
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AddSupplierPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @IsIn(FINANCE_PAYMENT_TYPES, { message: "To'lov turi noto'g'ri" })
  paymentType?: string;

  @IsOptional()
  @Matches(DATE_RE, { message: DATE_MSG })
  paymentDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SetOpeningDto {
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingCash!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  openingBank!: number;

  // Shu sanadan boshlab pul harakati hisoblanadi
  @IsNotEmpty()
  @Matches(DATE_RE, { message: DATE_MSG })
  startDate!: string;
}

export class CreateAdjustmentDto {
  @IsIn(['cash', 'bank'], { message: "Hisob 'cash' yoki 'bank' bo'lishi kerak" })
  account!: string;

  // Musbat — kirim, manfiy — chiqim
  @IsNumber()
  @Type(() => Number)
  amount!: number;

  @IsOptional()
  @Matches(DATE_RE, { message: DATE_MSG })
  adjustmentDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

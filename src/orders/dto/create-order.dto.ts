import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentType } from 'common/enums/paymentType.enum';

export class OrderItemInputDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  product_id!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  discount?: number;
}

// Aralash (mixed) to'lov qilinganda har bir usul bo'yicha summa
export class PaymentBreakdownInputDto {
  @IsNotEmpty()
  @IsEnum(PaymentType, { message: "To'lov turi noto'g'ri" })
  type!: PaymentType;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  amount!: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Chekda kamida bitta mahsulot bo\'lishi kerak' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemInputDto)
  items!: OrderItemInputDto[];

  @IsNotEmpty()
  @IsEnum(PaymentType, { message: "To'lov turi noto'g'ri" })
  paymentType!: PaymentType;

  // paymentType = 'mixed' bo'lganda majburiy
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentBreakdownInputDto)
  payments?: PaymentBreakdownInputDto[];

  // Qanchasi darhol to'landi. Berilmasa — chek summasi to'liq to'langan
  // deb hisoblanadi. total dan kam bo'lsa, qolgan qism qarz (debtAmount)
  // sifatida yoziladi (qarzdorlar moduli shu yerdan foydalanadi).
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  paidAmount?: number;

  // Qarz bo'lsa qaysi mijozga tegishli (qarzdorlar moduli tayyor bo'lgach
  // to'liq ishlaydi, hozircha faqat ID sifatida saqlanadi)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  customerId?: number;
}

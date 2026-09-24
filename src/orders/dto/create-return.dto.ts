import {
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ReturnItemInputDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  orderItemId!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0.001)
  @Type(() => Number)
  quantity!: number;
}

export class CreateReturnDto {
  @IsArray()
  @ArrayMinSize(1, { message: "Qaytarish uchun kamida bitta mahsulot ko'rsatilishi kerak" })
  @ValidateNested({ each: true })
  @Type(() => ReturnItemInputDto)
  items!: ReturnItemInputDto[];

  @IsOptional()
  @IsString()
  reason?: string;
}


import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsEnum, Min } from 'class-validator';
import { PriceMode } from 'common/enums/priceMode.enum';

export class CreateProductDto {

  
  @IsString()
  @IsNotEmpty()
  name!: string;

  // @IsNumber()
  // @IsNotEmpty()


  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  quantity!: number;



  @IsOptional()
  barcode?: string;

  @IsOptional()
  @IsNumber()
 max_quantity_notification?: number;

  @IsOptional()
  quick_code?: string

  @IsNotEmpty()
  @IsNumber()
  unit_id!: number



  // @IsBoolean()
  //  is_active?: boolean;


  // @IsNotEmpty()
  // @IsNumber()
  // category_id!: number;

  @IsNumber()
  @IsNotEmpty()
  purchase_price!: number;

  @IsNumber()
  @IsNotEmpty()
  selling_price!: number;

  @IsOptional()
  @IsNumber()
  deliveryCost?: number;


  @IsOptional()
  @IsNumber()
  vatRate?: number


  @IsOptional()
  costPrice?: number

  @IsEnum(PriceMode)
  @IsNotEmpty()
  pricing_strategy!: PriceMode







}


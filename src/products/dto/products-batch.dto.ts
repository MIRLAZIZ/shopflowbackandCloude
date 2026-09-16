import { IsNotEmpty, IsNumber, IsOptional, IsEnum } from "class-validator";

export class CreateProductBatchDto {

  @IsNumber()
  @IsNotEmpty()
  purchase_price!: number;

  @IsNumber()
  @IsNotEmpty()
  selling_price!: number;

  @IsNumber()
  @IsNotEmpty()
  quantity!: number;

  @IsNumber()
  @IsNotEmpty()
  product_id!: number;
  
  @IsNumber()
  @IsOptional()
  vatRate?: number;    // masalan: 12 (%)

  @IsNumber()
  @IsOptional()
  deliveryCost?: number; // butun batch uchun

  


  


}
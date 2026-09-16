import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchProductDto {
  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  quickCode?: string;

  // @IsOptional()
  // @Type(() => Number)
  // @IsNumber()
  // categoryId?: number;

  @IsOptional()
  @IsString()
  stock?: string;

  

  @IsOptional()
  @IsString()
  status?: string;
}
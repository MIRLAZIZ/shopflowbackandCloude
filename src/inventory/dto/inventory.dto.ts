import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class StartSessionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class RecordCountDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  batchId!: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  countedQuantity!: number;
}

export class CompleteSessionDto {
  @IsOptional()
  @IsString()
  note?: string;
}

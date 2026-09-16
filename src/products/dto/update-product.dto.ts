import { IsEnum, IsOptional, IsNumber, IsString, IsNotEmpty, IsBoolean, Min } from 'class-validator';
import { PriceMode } from 'common/enums/priceMode.enum';

export class UpdateProductDto {

    @IsNotEmpty()
    @IsString()
    name!: string;

    @IsOptional()
    barcode?: string;

    @IsOptional()
    @IsNumber()
    max_quantity_notification?: number ;

    @IsOptional()
    quick_code?: string

    @IsNotEmpty()
    @IsNumber()
    unit_id!: number

    // @IsBoolean()
    // is_active?: boolean;

    @IsEnum(PriceMode)
    @IsOptional()
    pricing_strategy?: PriceMode


    // @IsNotEmpty()
    // @IsNumber()
    // category_id!: number

    @IsNotEmpty()
    @IsNumber()
    selling_price!: number

    @IsNumber()
    @IsNotEmpty()
    @Min(1)
    quantity!: number;

}

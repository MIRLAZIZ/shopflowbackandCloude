import { IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CreateExpenseCategoryDto {
  @IsNotEmpty({ message: 'Kategoriya nomi kerak' })
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Rang #RRGGBB ko'rinishida bo'lishi kerak" })
  color?: string;
}

export class UpdateExpenseCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: "Rang #RRGGBB ko'rinishida bo'lishi kerak" })
  color?: string;
}

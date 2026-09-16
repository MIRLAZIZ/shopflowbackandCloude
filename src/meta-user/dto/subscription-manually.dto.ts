import { IsNotEmpty, IsNumber, IsOptional } from "class-validator";

export class subscriptionManuallyDto {

   

    @IsNotEmpty()
    @IsNumber()
    days!: number;

    @IsNotEmpty()
    @IsNumber()
    debtAmount!: number;

    @IsOptional()
    note!: string;
}
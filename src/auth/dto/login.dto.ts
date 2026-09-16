import { IsNotEmpty, IsString, Max, MaxLength, MinLength } from "class-validator";

export default class LoginDto { 
    @IsString()

    @IsNotEmpty()
    username!: string;

    @IsString()
    @IsNotEmpty()
    // @MinLength(6)
    @MaxLength(20)
    password!: string
}
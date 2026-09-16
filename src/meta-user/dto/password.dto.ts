import { IsNotEmpty, IsString, MinLength, MaxLength, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

// Maxsus validator: confirmPassword password bilan bir xil bo'lishi kerak
@ValidatorConstraint({ name: 'MatchPasswords', async: false })
class MatchPasswords implements ValidatorConstraintInterface {
  validate(confirmPassword: any, args: ValidationArguments) {
    const object = args.object as any;
    return object.password === confirmPassword;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Confirm password parol bilan mos kelmadi';
  }
}

export default class ChangePasswordDto {
  @IsString()
  @IsNotEmpty({ message: "Parol bo'sh bo'lishi mumkin emas" })
  @MinLength(6, { message: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" })
  @MaxLength(20, { message: "Parol maksimal 20 ta belgidan oshmasligi kerak" })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: "Confirm parol bo'sh bo'lishi mumkin emas" })
  @Validate(MatchPasswords)
  confirmPassword!: string;
}

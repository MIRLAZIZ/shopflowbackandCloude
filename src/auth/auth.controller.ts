import { Controller, Post, Body, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import  LoginDto  from './dto/login.dto';
import { User } from 'src/meta-user/user.entity';

@Controller('auth')
export class AuthController {
        constructor(private readonly authService: AuthService) {}

        @Post('login')
        @HttpCode(200)
        login(@Body() data: LoginDto): Promise<{ user: Partial<User>; token: string }> {
          return this.authService.login(data);
        }
}

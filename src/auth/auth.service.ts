import { Injectable, UnauthorizedException } from '@nestjs/common';
import LoginDto from './dto/login.dto';
import { UserService } from 'src/meta-user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/meta-user/user.entity';
import { SubscriptionStatus } from 'common/enums/subscription-status.enum';


@Injectable()
export class AuthService {
    constructor(private readonly userService: UserService, private readonly jwtService: JwtService) {}


async login(data: LoginDto): Promise<{ user: Partial<User>; token: string, roleOptions?:any }> {
  const user = await this.userService.findOneByUsername(data.username);

  // ✅ Avval null-check, keyingina user maydonlariga murojaat qilamiz
  // (aks holda user topilmasa "Cannot read properties of undefined" bilan
  // 500 qaytar edi, 401 o'rniga)
  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  if (user.subscriptionStatus === SubscriptionStatus.EXPIRED) {
    throw new UnauthorizedException('Obunangiz tugagan. Iltimos, to\'lovni amalga oshiring.')
  }

  

  
  const isPasswordValid = await bcrypt.compare(data.password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedException('parolll yoki username xato');
  }
 
  // ⚠️ createdBy'dan faqat id olinadi — to'liq User obyektini (parol
  // hash'i bilan) JWT payload ichiga yozib bo'lmaydi.
  const payload = {
    username: user.username,
    id: user.id,
    role: user.role,
    expiryDate: user.expiryDate,
    createdBy: user.createdBy ? { id: user.createdBy.id } : null,
  };
  const token = this.jwtService.sign(payload);

  const { password, expiryDate, adminNote, balance, telegramGroupId, telegramId, manualExtensionCount, ...result } = user;

  return { user: result, token, };
}

}

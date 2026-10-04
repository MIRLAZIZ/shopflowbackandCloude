import { Injectable, UnauthorizedException } from '@nestjs/common';
import LoginDto from './dto/login.dto';
import { UserService } from 'src/meta-user/user.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from 'src/meta-user/user.entity';
import { SubscriptionStatus } from 'common/enums/subscription-status.enum';
import { AuditService } from 'src/audit/audit.service';
import { AuditAction } from 'src/audit/entities/audit-log.entity';
import { getOwnerId } from 'common/utils/owner.util';


@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
        private readonly auditService: AuditService,
    ) {}


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

  const ownerId = getOwnerId({ id: user.id, role: user.role, createdBy: user.createdBy ? { id: user.createdBy.id } : null });
  await this.auditService.log({
    ownerId,
    userId: user.id,
    userName: user.username,
    action: AuditAction.LOGIN,
    entityType: 'User',
    entityId: user.id,
    entityLabel: user.username,
    description: `${user.username} tizimga kirdi`,
  });

  return { user: result, token, };
}

}

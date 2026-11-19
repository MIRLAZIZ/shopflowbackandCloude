
import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/meta-user/user.service';
import { Role } from 'common/enums/role.enum';
import { SubscriptionStatus } from 'common/enums/subscription-status.enum';
import { SubscriptionCacheService } from 'src/subscription/subscription-cache.service';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly subCache: SubscriptionCacheService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header not found');
    }

    const token = authHeader.split(' ')[1];

    // 1. Tokenni tekshirish
    let decoded: any;
    try {
      decoded = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token yaroqsiz yoki muddati tugagan');
    }

    // 2. Admin uchun obuna tekshiruvi shart emas
    if (decoded.role !== Role.Admin) {
      // Xodim bo'lsa egasining ID si, Client bo'lsa o'zining ID si
      const ownerId: number = decoded.ownerId ?? decoded.id;

      let blocked = this.subCache.isBlocked(ownerId);

      // 3. Cache'da yo'q bo'lsa (birinchi so'rov yoki restart) DB'dan bir marta olamiz
      if (blocked === undefined) {
        const owner = await this.userService.findById(ownerId);
        if (!owner) {
          throw new UnauthorizedException('Foydalanuvchi topilmadi');
        }

        blocked = owner.subscriptionStatus === SubscriptionStatus.EXPIRED;
        this.subCache.set(ownerId, blocked);
      }

      // 4. Bloklangan bo'lsa to'xtatamiz
      if (blocked) {
        throw new ForbiddenException(
          "Obunangiz tugagan. Iltimos, to'lovni amalga oshiring.",
        );
      }
    }

    req['user'] = decoded;
    next();
  }
}

import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/meta-user/user.service';
import { Role } from 'common/enums/role.enum';
import { SubscriptionStatus } from 'common/enums/subscription-status.enum';

@Injectable()
export class JwtAuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService
  ) { }

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization header not found');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decodedUser = this.jwtService.verify(token);

      const user = await this.userService.findById(decodedUser.id);
      

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Admin uchun obuna tekshiruvi shart emas
      if (user.role !== Role.Admin ) {
        const userSubscriptionStatus = user.subscriptionStatus == SubscriptionStatus.EXPIRED ;

        if (userSubscriptionStatus) {
          throw new ForbiddenException('Obunangiz tugagan. Iltimos, to\'lovni amalga oshiring.');
        }
      }

      req['user'] = decodedUser;
      next();
    } catch (err) {
      if (err instanceof ForbiddenException || err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException(err);
    }
  }
}

import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';

@Injectable()
export class JwtSocketGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    // 👇 HTTP emas, SOCKET ekanini aytamiz
    const client: Socket = context.switchToWs().getClient<Socket>();

    // 1️⃣ tokenni olish
    const token =
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {

      client.emit('error', 'Socket token topilmadi');
      // throw new UnauthorizedException('Socket token topilmadi');
    }

    try {
      // 2️⃣ tokenni tekshirish
      const payload = this.jwtService.verify(token);

      // 3️⃣ user ni socket ga biriktirib qo‘yamiz
      client.data.user = payload;

      return true;
    } catch (error) {
                // throw new UnauthorizedException('Socket token yaroqsiz');
      client.emit('error', 'Socket token yaroqsiz');
      return false;
    }
  }
}

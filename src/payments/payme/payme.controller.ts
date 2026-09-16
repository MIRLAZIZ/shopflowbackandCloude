import { Body, Controller, Headers, Param, ParseIntPipe, Post } from '@nestjs/common';
import { PaymeService } from './payme.service';
import { PaymeRequestDto } from './dto/payme-request.dto';
import { PaymeError } from './payme.constants';

@Controller('payments/payme')
export class PaymeController {
  constructor(private readonly paymeService: PaymeService) {}

  // Frontend/bot shu endpointni chaqirib, foydalanuvchini Payme checkout'ga yo'naltiradi
  @Post('invoice/:userId')
  async createInvoice(@Param('userId', ParseIntPipe) userId: number) {
    return this.paymeService.generateInvoice(userId);
  }

  // Payme serverlari shu bitta URL'ga barcha metodlarni JSON-RPC formatida yuboradi
  @Post('webhook')
  async webhook(@Body() dto: PaymeRequestDto, @Headers('authorization') authHeader?: string) {
    if (!this.paymeService.verifyAuth(authHeader)) {
      return {
        jsonrpc: '2.0',
        id: dto.id,
        error: {
          code: PaymeError.AUTH_FAILED,
          message: { uz: 'Avtorizatsiya xato', ru: 'Ошибка авторизации', en: 'Authorization failed' },
        },
      };
    }

    return this.paymeService.handle(dto);
  }
}

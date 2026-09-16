import { Body, Controller, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ClickService } from './click.service';
import { ClickRequestDto } from './dto/click-request.dto';
import { ClickAction } from './click.constants';

@Controller('payments/click')
export class ClickController {
  constructor(private readonly clickService: ClickService) {}

  // Frontend/bot shu endpointni chaqirib, foydalanuvchini Click sahifasiga yo'naltiradi
  @Post('invoice/:userId')
  async createInvoice(@Param('userId', ParseIntPipe) userId: number) {
    return this.clickService.generateInvoice(userId);
  }

  // Click serverlari shu bitta URL'ga POST qiladi, action orqali Prepare/Complete ajratiladi
  @Post('webhook')
  async webhook(@Body() dto: ClickRequestDto) {
    if (Number(dto.action) === ClickAction.PREPARE) {
      return this.clickService.handlePrepare(dto);
    }
    return this.clickService.handleComplete(dto);
  }
}

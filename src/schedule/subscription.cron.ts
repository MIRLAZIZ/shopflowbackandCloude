import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { UserService } from '../meta-user/user.service';
import { TelegramService } from 'src/telegram/telegram.service';

@Injectable()
export class SubscriptionCron {
  constructor(
    private readonly userService: UserService,
    private readonly telegramService: TelegramService
  ) {}

 @Cron('0 0 * * *', {
  timeZone: 'Asia/Tashkent',
})
async handleCron() {
  const users = await this.userService.expireOverdueSubscriptions();

  for (const user of users) {
    if (user.telegramId ) {
      await this.telegramService.sendSubscriptionExpriyMassage(
        user.telegramId,
        '❌ Obunangiz muddati tugadi.'
      );
    }

    if (user.telegramGroupId) {
      await this.telegramService.sendSubscriptionsExpriyTelgramGroup(
        Number(user.telegramGroupId),
        `⚠️ ${user.fullName} ning obunasi tugadi.`
      );
    }
  }
}
}
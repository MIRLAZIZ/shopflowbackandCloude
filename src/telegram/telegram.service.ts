import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ReducedInterface } from 'common/interface/reduced.interface';
import { InjectBot } from 'nestjs-telegraf';
import { UserService } from 'src/meta-user/user.service';
import { Telegraf } from 'telegraf';

@Injectable()
export class TelegramService {
  constructor(
    private readonly userService: UserService,
    @InjectBot() private readonly bot: Telegraf<any>, // ← inject
  ) {
  }

  async sendToUser(username: string, message: string) {
    const user = await this.userService.findByUsername(username);
    if (!user || !user.telegramId) {
      // ❌ User topilmadi yoki Telegram ID mavjud emas
      throw new NotFoundException('User topilmadi yoki Telegram ID mavjud emas');
    }


    await this.bot.telegram.sendMessage(user.telegramId, message);

    return 'xabar yuborildiiiiiiiii';
  }



  async sendToAdmin(message: string) {
    const admins = await this.userService.findByRoleClient();
    for (const admin of admins) {
      if (admin.telegramId) {
        await this.bot.telegram.sendMessage(admin.telegramGroupId, message);
      }
    }
    return 'xabar muvaffaqiyatli yuborildi';
  }


  async sendToGroup(userId: number, message: string) {
    const user = await this.userService.findById(userId);


    if (!user || !user.telegramGroupId) {
      // ❌ User topilmadi yoki group ID mavjud emas
      throw new NotFoundException('User topilmadi yoki guruh ID mavjud emas');
    }
    // ✅ To'g'ri tekshiruv
    const userTelegramGroupId = Number(user.telegramGroupId);
    if (!userTelegramGroupId || userTelegramGroupId >= 0) {
      throw new BadRequestException('Guruh ID noto\'g\'ri (manfiy bo\'lishi kerak)');
    }


    await this.bot.telegram.sendMessage(user.telegramGroupId, message);
    return 'xabar muvaffaqiyatli yuborildi';
  }


  async sendReducedProduct(products: ReducedInterface[]) {

    const message = `
⚠️ <b>Kamaygan mahsulotlar ro‘yxati</b>
━━━━━━━━━━━━━━━━━━━━━━

${products.map((p, index) =>
      `┃ ${index + 1}. <b>${p.name}</b>
┃ Qoldiq: <b>${p.quantity}</b>`
    ).join('\n━━━━━━━━━━━━━━━━━━━━━━\n')}

━━━━━━━━━━━━━━━━━━━━━━
⏰ ${new Date().toLocaleString()}
`;



    await this.bot.telegram.sendMessage(Number(products[0].telegramGroupId), message, {
      parse_mode: 'HTML'
    });

    return 'xabar muvaffaqiyatli yuborildi';
  }

  async sendSubscriptionExpriyMassage( teleramId: number, message: string,) {
    await this.bot.telegram.sendMessage(teleramId, message)
  }

  async sendSubscriptionsExpriyTelgramGroup(telegramGroupId: number, message: string) {
    await this.bot.telegram.sendMessage(telegramGroupId, message)
  }
}
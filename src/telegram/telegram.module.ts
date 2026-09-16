import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';
import { TelegramUpdate } from './telegram.update';
import {session}  from 'telegraf';
import { UserModule } from 'src/meta-user/user.module';
import { TelegramController } from './telegram.conroller';

@Module({
  imports: [
 TelegrafModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    token: config.getOrThrow<string>('TELEGRAM_BOT_TOKEN'),
    middlewares:[session()]
  }),
}),
UserModule
  ],
  controllers: [TelegramController],
  providers: [TelegramService, TelegramUpdate],
  exports: [TelegramService],
})
export class TelegramModule {}
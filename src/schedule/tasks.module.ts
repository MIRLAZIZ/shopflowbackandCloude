import { ScheduleModule } from '@nestjs/schedule';
import { Module } from '@nestjs/common';
import { UserModule } from 'src/meta-user/user.module';
import { SubscriptionCron } from './subscription.cron';
import {TelegramModule} from "src/telegram/telegram.module";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    UserModule,
    TelegramModule
  ],
  providers: [SubscriptionCron],
})
export class TasksModule {}
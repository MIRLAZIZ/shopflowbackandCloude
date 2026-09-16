import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ProductsModule } from 'src/products/products.module';
import { BullModule } from '@nestjs/bullmq';
import { NotificationProcessor } from './notification.processor';
import { NotificationsGateway } from './notifications.gateway';
import { TelegramModule } from 'src/telegram/telegram.module';

@Module({
  imports: [ProductsModule, BullModule.registerQueue({ name: 'sales-queue' }), TelegramModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationProcessor, NotificationsGateway],
})
export class NotificationsModule { }

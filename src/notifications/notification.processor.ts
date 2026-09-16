import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { ReducedInterface } from 'common/interface/reduced.interface';
import { TelegramService } from 'src/telegram/telegram.service';
// import TelegramBot from 'node-telegram-bot-api';

@Injectable()
@Processor('sales-queue')
export class NotificationProcessor extends WorkerHost {
  private io: Server;
  // private telegramBot: TelegramBot;

  constructor(
    private readonly notificationsGateway: NotificationsGateway,
    private readonly telgramService: TelegramService
  ) {
    super();
  }



  async process(job: Job<ReducedInterface[]>) {
    if (job.name !== 'sale-created') return;






    // this.notificationsGateway.sendNotification(job.data);
    this.telgramService.sendReducedProduct(job.data);


  }
}

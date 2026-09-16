import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Payment } from './entities/payment.entity';
import { PaymentsService } from './payments.service';
import { ClickController } from './click/click.controller';
import { ClickService } from './click/click.service';
import { PaymeController } from './payme/payme.controller';
import { PaymeService } from './payme/payme.service';
import paymentConfig from './config/payment.config';
import { UserModule } from 'src/meta-user/user.module'; // loyihangizdagi haqiqiy yo'lga moslang

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment]),
    ConfigModule.forFeature(paymentConfig),
    UserModule, // UsersService (activateSubscription) shu yerdan eksport qilingan bo'lishi kerak
  ],
  controllers: [ClickController, PaymeController],
  providers: [PaymentsService, ClickService, PaymeService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

import { Module } from '@nestjs/common';
import { StatisticsService } from './statistics.service';
import { StatisticsController } from './statistics.controller';
import { StatisticsGateway } from './statistics.geteway';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Statistics } from './entities/statistic.entity';
import { AuthModule } from 'src/auth/auth.module';
import { Order } from 'src/orders/entities/order.entity';
import { Debt } from 'src/debts/entities/debt.entity';
import { Product } from 'src/products/entities/product.entity';

@Module({
  // ⚠️ Order/Debt/Product MODULLARI emas, faqat ularning entity'lari
  // ro'yxatdan o'tkazilgan — aks holda OrdersModule <-> StatisticsModule
  // o'rtasida circular dependency hosil bo'lar edi (OrdersModule
  // allaqachon StatisticsModule'ni import qiladi)
  imports: [TypeOrmModule.forFeature([Statistics, Order, Debt, Product]), AuthModule],
  controllers: [StatisticsController],
  providers: [StatisticsService, StatisticsGateway],
  exports: [StatisticsService],
})
export class StatisticsModule {}

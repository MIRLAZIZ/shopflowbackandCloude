import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderReturn } from './entities/order-return.entity';
import { OrderReturnItem } from './entities/order-return-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductsModule } from 'src/products/products.module';
import { StatisticsModule } from 'src/statistics/statistics.module';
import { DebtsModule } from 'src/debts/debts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, OrderReturn, OrderReturnItem, Product]),
    ProductsModule,
    StatisticsModule,
    DebtsModule,
    // Nom tarixiy sabablarga ko'ra 'sales-queue' — notifications moduli
    // shu nom bilan tinglaydi (kam qolgan mahsulot bildirishnomasi)
    BullModule.registerQueue({ name: 'sales-queue' }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

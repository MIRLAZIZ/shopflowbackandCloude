import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { ProductBatch } from './entities/product-batch.entity';
import { OrderItem } from 'src/orders/entities/order-item.entity';
import { Unit } from 'src/units/entities/unit.entity';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductBatch, Unit, OrderItem]), AuditModule],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService]
})
export class ProductsModule {

}


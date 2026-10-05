import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { InventorySession } from './entities/inventory-session.entity';
import { InventoryCountItem } from './entities/inventory-count-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductBatch } from 'src/products/entities/product-batch.entity';
import { AuditModule } from 'src/audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InventorySession, InventoryCountItem, Product, ProductBatch]),
    AuditModule,
  ],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}

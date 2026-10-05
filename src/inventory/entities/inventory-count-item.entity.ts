import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { InventorySession } from './inventory-session.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductBatch } from 'src/products/entities/product-batch.entity';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

@Entity({ name: 'inventory_count_items' })
export class InventoryCountItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => InventorySession, session => session.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session!: InventorySession;

  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => ProductBatch, { eager: false })
  @JoinColumn({ name: 'product_batch_id' })
  productBatch!: ProductBatch;

  // Sessiya boshlanganda tizimda yozilgan miqdor (snapshot)
  @Column({
    type: 'decimal', precision: 18, scale: 3,
    transformer: decimalTransformer,
  })
  systemQuantity!: number;

  // Haqiqatda sanab topilgan miqdor — hali sanalmagan bo'lsa null
  @Column({
    type: 'decimal', precision: 18, scale: 3, nullable: true,
    transformer: decimalTransformer,
  })
  countedQuantity!: number | null;

  // countedQuantity - systemQuantity (musbat = ortiqcha, manfiy = kamomad)
  @Column({
    type: 'decimal', precision: 18, scale: 3, nullable: true,
    transformer: decimalTransformer,
  })
  difference!: number | null;

  @Column({ name: 'counted_by', type: 'int', nullable: true })
  countedBy!: number | null;

  @Column({ name: 'counted_at', type: 'timestamp', nullable: true })
  countedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;
}

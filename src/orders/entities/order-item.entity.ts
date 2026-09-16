import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Product } from 'src/products/entities/product.entity';
import { ProductBatch } from 'src/products/entities/product-batch.entity';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

// Chekdagi bitta qator. FIFO tufayli bitta mahsulot bir nechta partiyadan
// olinsa, o'sha mahsulot uchun bir nechta OrderItem yaratiladi (har biri
// o'z partiyasiga bog'langan holda) — lekin ular bitta Order'ga tegishli.
@Entity({ name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @ManyToOne(() => Product, (product) => product.orderItems, { eager: false })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @ManyToOne(() => ProductBatch, (batch) => batch.orderItems, {
    eager: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'product_batch_id' })
  productBatch!: ProductBatch;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  quantity!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  selling_price!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  purchase_price!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discount!: number;

  // (selling_price * quantity) - discount
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  total!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrderReturn } from './order-return.entity';
import { OrderItem } from './order-item.entity';
import { Product } from 'src/products/entities/product.entity';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

@Entity({ name: 'order_return_items' })
export class OrderReturnItem {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => OrderReturn, (orderReturn) => orderReturn.items, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'order_return_id' })
  orderReturn!: OrderReturn;

  @ManyToOne(() => OrderItem, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'order_item_id' })
  orderItem!: OrderItem;

  // Ko'rsatish uchun qulay bo'lishi uchun mahsulotga ham to'g'ridan-to'g'ri
  // havola (OrderItem o'chib ketmaydi, lekin so'rovni soddalashtiradi)
  @ManyToOne(() => Product, { eager: false })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

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
  refundAmount!: number;
}

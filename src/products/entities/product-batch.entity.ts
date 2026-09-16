// product-price-history.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn, OneToMany } from "typeorm";
import { Product } from "./product.entity";
import { OrderItem } from "src/orders/entities/order-item.entity";
import { BatchStatus } from "common/enums/batch-status.enum";

@Entity()
export class ProductBatch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column('decimal', { precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  purchase_price!: number;

  @Column('decimal', { precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  selling_price!: number;

  @Column('decimal', { precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  deliveryCost!: number;


  @Column()
  vatRate!: number

  @Column('decimal', { precision: 18, scale: 2, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  costPrice!: number



  @Column({
    type: 'decimal',
    precision: 18,
    scale: 3,
    transformer: {
      to: (value: number) => value,
      from: (value: number) => Number(value),
    }
  })
  quantity!: number;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.PENDING })
  status!: BatchStatus

  @Column({type: 'decimal',precision: 18, scale: 3, default: 0, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  remaining_quantity!: number;  // ← qolgan miqdor (sotuv ayiriladi)

  @Column({ nullable: true })
  activated_at!: Date;          // ← qachon aktivlashdi

  @Column({ nullable: true })
  depleted_at!: Date;           // ← qachon tugadi


  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => Product, (product) => product.product_batches, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product!: Product;

  @OneToMany(() => OrderItem, (orderItem) => orderItem.productBatch)
  orderItems!: OrderItem[];

}

// ================================================================


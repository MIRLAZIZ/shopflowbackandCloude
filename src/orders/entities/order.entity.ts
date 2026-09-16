import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from 'src/meta-user/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from 'common/enums/order-status.enum';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

// Bitta "chek" (order) — mijozga berilgan yagona sotuv hujjati.
// Ichida bir nechta OrderItem (chek qatorlari) bo'lishi mumkin, FIFO
// tufayli bitta mahsulot bir nechta partiyadan (batch) kelib, bir nechta
// OrderItem sifatida saqlanishi mumkin.
@Entity({ name: 'orders' })
@Index('idx_orders_owner_created', ['ownerId', 'createdAt'])
export class Order {
  @PrimaryGeneratedColumn()
  id!: number;

  // Do'kon egasining ID'si — barcha ma'lumotlar shu bo'yicha ajratiladi
  // (kassir sotgan bo'lsa ham). Ko'p ijarachilik (multi-tenancy) shu
  // maydonga tayanadi, User.id ga emas.
  @Column({ name: 'owner_id' })
  ownerId!: number;

  // Sotuvni bevosita amalga oshirgan xodim (do'kon egasi yoki kassir)
  @ManyToOne(() => User, (user) => user.orders, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => OrderItem, (item) => item.order, {
    cascade: true,
    eager: false,
  })
  items!: OrderItem[];

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  subtotal!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  discount!: number;

  // Jami summa (subtotal - discount)
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  total!: number;

  // Haqiqatda to'langan summa (naqd/karta/o'tkazma yig'indisi)
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  paidAmount!: number;

  // total - paidAmount (0 dan katta bo'lsa — qarzdorlar moduliga tegishli)
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  debtAmount!: number;

  // cash | card | transfer | mixed | debt
  @Column({ type: 'varchar', length: 50 })
  paymentType!: string;

  // Aralash to'lov bo'lsa: [{ type: 'cash', amount: 5000 }, { type: 'card', amount: 3000 }]
  @Column({ type: 'json', nullable: true })
  paymentBreakdown!: { type: string; amount: number }[] | null;

  // TODO(qarzdorlar moduli): Customer entity tayyor bo'lgach shu yerga
  // to'g'ridan-to'g'ri ManyToOne relation qo'yiladi. Hozircha faqat ID
  // saqlanadi, jadval sxemasi keyin o'zgarmasligi uchun.
  @Column({ name: 'customer_id', nullable: true })
  customerId!: number | null;

  @Column({ type: 'enum', enum: OrderStatus, default: OrderStatus.COMPLETED })
  status!: OrderStatus;

  @Column({ type: 'text', nullable: true })
  cancelledReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  @Column({ nullable: true })
  cancelledBy!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

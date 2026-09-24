import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Order } from './order.entity';
import { User } from 'src/meta-user/user.entity';
import { OrderReturnItem } from './order-return-item.entity';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

// Bitta qaytarish (vozvrat) hodisasi. Bitta chekdan bir necha marta
// (turli kunlarda) qisman qaytarish bo'lishi mumkin — shuning uchun
// har bir qaytarish alohida yozuv, OrderItem'ning o'zida esa faqat
// jami qaytarilgan miqdor (returnedQuantity) saqlanadi.
@Entity({ name: 'order_returns' })
@Index('idx_order_returns_owner_created', ['ownerId', 'createdAt'])
export class OrderReturn {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @ManyToOne(() => Order, { eager: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  // Qaytarishni qabul qilgan xodim
  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => OrderReturnItem, (item) => item.orderReturn, {
    cascade: true,
  })
  items!: OrderReturnItem[];

  // Mijozga qaytarilishi kerak bo'lgan umumiy summa (agar qarzga
  // hisoblangan bo'lsa — shu summaga qarz kamaytiriladi, aks holda
  // naqd/karta orqali mijozga qaytariladi)
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalRefundAmount!: number;

  // Qaytarilgan summaning qaysi qismi qarzni kamaytirishga ketdi
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  appliedToDebt!: number;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}

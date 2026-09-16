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
import { Customer } from 'src/customers/entities/customer.entity';
import { Order } from 'src/orders/entities/order.entity';
import { DebtPayment } from './debt-payment.entity';
import { DebtStatus } from 'common/enums/debt-status.enum';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

@Entity({ name: 'debts' })
@Index('idx_debts_owner_status', ['ownerId', 'status'])
export class Debt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @ManyToOne(() => Customer, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  // Qaysi chekdan kelib chiqqan qarz (chek bekor qilinsa, qarz ham
  // avtomatik bekor qilinadi — ordersService.cancel orqali)
  @ManyToOne(() => Order, { eager: false, nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'order_id' })
  order!: Order | null;

  // Boshlang'ich qarz summasi
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  paidAmount!: number;

  // amount - paidAmount
  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  remainingAmount!: number;

  @Column({ type: 'timestamp', nullable: true })
  dueDate!: Date | null;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.OPEN })
  status!: DebtStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @OneToMany(() => DebtPayment, (payment) => payment.debt, { cascade: true })
  payments!: DebtPayment[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn,
  CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { Supplier } from './supplier.entity';
import { SupplierPayment } from './supplier-payment.entity';
import { DebtStatus } from 'common/enums/debt-status.enum';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

// Yetkazib beruvchiga qarz (kreditorlik qarzi): mahsulot qarzga sotib
// olinganda yoziladi. Mijozlar qarzidan (Debt) farqi — bu BIZ to'laymiz.
@Entity({ name: 'supplier_debts' })
@Index('idx_supplier_debts_owner_status', ['ownerId', 'status'])
export class SupplierDebt {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @ManyToOne(() => Supplier, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'supplier_id' })
  supplier!: Supplier;

  // Xaridning to'liq summasi
  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  paidAmount!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer })
  remainingAmount!: number;

  // Xarid sanasi (YYYY-MM-DD)
  @Column({ name: 'debt_date', type: 'date' })
  debtDate!: string;

  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate!: string | null;

  @Column({ type: 'enum', enum: DebtStatus, default: DebtStatus.OPEN })
  status!: DebtStatus;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @OneToMany(() => SupplierPayment, p => p.debt)
  payments!: SupplierPayment[];

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

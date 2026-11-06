import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, Index,
} from 'typeorm';
import { SupplierDebt } from './supplier-debt.entity';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

// Yetkazib beruvchiga qilingan to'lov (pul chiqimi)
@Entity({ name: 'supplier_payments' })
@Index('idx_supplier_payments_owner_date', ['ownerId', 'paymentDate'])
export class SupplierPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => SupplierDebt, d => d.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debt_id' })
  debt!: SupplierDebt;

  // Pul oqimini tez hisoblash uchun (qarz orqali JOIN qilmaslik)
  @Column({ name: 'owner_id' })
  ownerId!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer })
  amount!: number;

  // cash | card | transfer
  @Column({ type: 'varchar', length: 20, default: 'cash' })
  paymentType!: string;

  @Column({ name: 'payment_date', type: 'date' })
  paymentDate!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

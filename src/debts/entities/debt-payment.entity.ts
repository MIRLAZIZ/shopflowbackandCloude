import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Debt } from './debt.entity';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

@Entity({ name: 'debt_payments' })
export class DebtPayment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => Debt, (debt) => debt.payments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'debt_id' })
  debt!: Debt;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  @Column({ type: 'varchar', length: 50 })
  paymentType!: string; // cash | card | transfer

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // To'lovni qabul qilgan xodim
  @Column({ name: 'created_by' })
  createdBy!: number;

  @CreateDateColumn()
  createdAt!: Date;
}

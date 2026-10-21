import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ExpenseCategory } from './expense-category.entity';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

@Entity({ name: 'expenses' })
@Index('idx_expenses_owner_date', ['ownerId', 'expenseDate'])
export class Expense {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @ManyToOne(() => ExpenseCategory, { eager: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: ExpenseCategory;

  @Column({
    type: 'decimal',
    precision: 18,
    scale: 2,
    transformer: decimalTransformer,
  })
  amount!: number;

  // cash | card | transfer
  @Column({ type: 'varchar', length: 20, default: 'cash' })
  paymentType!: string;

  // Xarajat qilingan sana (YYYY-MM-DD) — yozilgan vaqtdan farq qilishi mumkin
  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  // Kim kiritgani (xodim yoki egasi)
  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @Column({ name: 'created_by_name', type: 'varchar', length: 100, nullable: true })
  createdByName!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

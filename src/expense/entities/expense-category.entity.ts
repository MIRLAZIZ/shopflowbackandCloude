import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';

// Xarajat kategoriyasi (Ijara, Maosh, Kommunal va h.k.) — har bir do'kon
// egasi (ownerId) o'zining kategoriyalarini yuritadi.
@Entity({ name: 'expense_categories' })
@Index('idx_expense_categories_owner', ['ownerId'])
@Unique('uq_expense_category_owner_name', ['ownerId', 'name'])
export class ExpenseCategory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  // Interfeysda chip rangi (masalan "#7367F0")
  @Column({ type: 'varchar', length: 20, nullable: true })
  color!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}

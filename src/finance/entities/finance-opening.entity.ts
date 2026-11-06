import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Unique } from 'typeorm';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

// Boshlang'ich qoldiq: tizimdan foydalanishni boshlagan sanadagi naqd pul va
// bank/karta hisobidagi mablag'. Pul qoldig'i SHU sanadan keyingi harakatlar
// (savdo, xarajat, to'lovlar) qo'shilib hisoblanadi.
@Entity({ name: 'finance_openings' })
@Unique('uq_finance_opening_owner', ['ownerId'])
export class FinanceOpening {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  openingCash!: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0, transformer: decimalTransformer })
  openingBank!: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate!: string;

  @Column({ name: 'updated_by', type: 'int' })
  updatedBy!: number;

  @UpdateDateColumn()
  updatedAt!: Date;
}

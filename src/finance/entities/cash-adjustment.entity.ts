import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { decimalTransformer } from 'common/transformers/decimal.transformer';

// Qo'lda kiritiladigan pul harakati: kapital kiritish (+), egasi pul olishi (−),
// tizimda yozilmagan xarid uchun to'lov (−), tuzatish va h.k.
@Entity({ name: 'cash_adjustments' })
@Index('idx_cash_adjustments_owner_date', ['ownerId', 'adjustmentDate'])
export class CashAdjustment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  // cash — naqd pul, bank — karta/hisob raqam
  @Column({ type: 'varchar', length: 10 })
  account!: string;

  // Musbat — kirim, manfiy — chiqim
  @Column({ type: 'decimal', precision: 18, scale: 2, transformer: decimalTransformer })
  amount!: number;

  @Column({ name: 'adjustment_date', type: 'date' })
  adjustmentDate!: string;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @Column({ name: 'created_by', type: 'int' })
  createdBy!: number;

  @Column({ name: 'created_by_name', type: 'varchar', length: 100, nullable: true })
  createdByName!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}

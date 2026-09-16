import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
  ManyToOne,
} from 'typeorm';
import { User } from 'src/meta-user/user.entity'; 
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user!: User;

  @Column()
  userId!: number;

  @Column({ type: 'enum', enum: PaymentProvider })
  provider!: PaymentProvider;

  // Bizning tizimimizdagi noyob to'lov identifikatori.
  // Click uchun: merchant_trans_id sifatida yuboriladi.
  // Payme uchun: Create so'rovida kelgan `account.order_id` yoki shu maydonga yozamiz.
  @Index({ unique: true })
  @Column()
  merchantTransId!: string;

  // Provayder tomonidagi tranzaksiya ID'si (Click: click_trans_id, Payme: id)
  // Webhook birinchi marta kelganda bo'sh, keyin to'ldiriladi.
  @Index()
  @Column({ type: 'varchar', nullable: true })
  providerTransId!: string | null;

  // Summasi har doim SO'MDA saqlanadi (Payme tiyinda yuboradi, konvertatsiya service ichida)
  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: number;

  @Column({ type: 'enum', enum: PaymentStatus, default: PaymentStatus.CREATED })
  status!: PaymentStatus;

  // Payme o'zining ichki holatini (1, 2, -1, -2) alohida talab qiladi
  @Column({ type: 'int', nullable: true })
  paymeState!: number | null;

  // Bekor qilish sababi (Payme: reason kodi, Click: error kodi)
  @Column({ type: 'int', nullable: true })
  cancelReason!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @Column({ type: 'timestamp', nullable: true })
  performedAt!: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt!: Date | null;

  // Click va Payme'dan kelgan xom so'rovni debug uchun saqlab qo'yamiz
  @Column({ type: 'json', nullable: true })
  rawPayload!: Record<string, any> | null;
}

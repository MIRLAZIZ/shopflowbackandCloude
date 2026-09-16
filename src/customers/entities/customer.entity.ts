import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

// Mijoz — qarzdorlar moduli uchun. Do'kon egasi (ownerId) bo'yicha
// ajratiladi, shunday qilib kassir ham o'z do'konining mijozlarini
// ko'ra/qo'sha oladi.
@Entity({ name: 'customers' })
@Index('idx_customers_owner', ['ownerId'])
export class Customer {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'owner_id' })
  ownerId!: number;

  @Column()
  fullName!: string;

  @Column({ nullable: true })
  phone!: string | null;

  @Column({ type: 'text', nullable: true })
  note!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}

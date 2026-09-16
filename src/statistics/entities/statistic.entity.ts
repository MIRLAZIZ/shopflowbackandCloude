import { 
  Entity, 
  PrimaryGeneratedColumn, 
  Column, 
  CreateDateColumn, 
  UpdateDateColumn, 
  ManyToOne, 
  JoinColumn, 
  Index 
} from 'typeorm';
import { User } from 'src/meta-user/user.entity';
import { Product } from 'src/products/entities/product.entity';

@Entity('statistics')
@Index(['user', 'product', 'date'], { unique: true }) // Bir user, bir product, bir kun - faqat 1 ta yozuv
export class Statistics {
  @PrimaryGeneratedColumn()
  id: number;

  // Qaysi user?
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // Qaysi mahsulot?
  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  // Shu mahsulotdan shu kunda jami sotuv summasi
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  total_sales: number;

  // Shu mahsulotdan shu kunda nechta sotilgan
  @Column({ type: 'int', default: 0 })
  total_quantity: number;

  // Shu mahsulot shu kunda necha marta sotilgan (transactions)
  @Column({ type: 'int', default: 0 })
  total_transactions: number;

  // Shu mahsulotdan shu kunda qancha foyda
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0, transformer: { to: (value: number) => value, from: (value: number) => Number(value) } })
  total_profit: number;

  // Shu mahsulotga shu kunda qancha chegirma berilgan
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 , transformer: { to: (value: number) => value, from: (value: number) => Number(value) }})
  total_discount: number;

  // Qaysi kun? (Format: YYYY-MM-DD)
  @Column({ type: 'date' })
  date: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
